import json
import uuid
import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy import text
from app.db import get_engine
from app.features.feature_pipeline import (
    extract_position_features,
    extract_candidate_features,
)
from app.datasets.schemas import PeakTargetConfig
from app.datasets.target_generation import select_peak_target

def generate_retraining_dataset(
    user_id: str,
    dataset_version: str = "v2",
    window_game_count: int = 120
) -> Dict[str, Any]:
    """
    Generates a versioned, expanding-window, strictly chronological dataset
    for continuous model retraining (Phase 16).
    """
    engine = get_engine()
    
    # 1. Fetch chronologically sorted games
    with engine.connect() as conn:
        games_query = text("""
            SELECT g.id, g."playedAt"
            FROM "Game" g
            JOIN "ChessProfile" cp ON cp.id = g."chessProfileId"
            WHERE cp."userId" = :userId AND g."analyzed" = true
            ORDER BY g."playedAt" ASC
        """)
        games_rows = conn.execute(games_query, {"userId": user_id}).fetchall()
        
    if not games_rows or len(games_rows) < 10:
        raise ValueError(f"Insufficient games for dataset generation: found {len(games_rows)}")
        
    selected_games = games_rows[:window_game_count]
    total_games = len(selected_games)
    
    train_count = max(1, int(total_games * 0.70))
    val_count = max(1, int(total_games * 0.15))
    test_count = total_games - train_count - val_count
    if test_count <= 0:
        test_count = 1
        train_count = total_games - val_count - test_count
        
    game_split_map = {}
    train_dates, val_dates, test_dates = [], [], []
    
    for idx, (gid, played_at) in enumerate(selected_games):
        if idx < train_count:
            split = "TRAIN"
            train_dates.append(played_at)
        elif idx < train_count + val_count:
            split = "VALIDATION"
            val_dates.append(played_at)
        else:
            split = "TEST"
            test_dates.append(played_at)
        game_split_map[gid] = split

    # 2. Strict Temporal Leakage Audit
    max_train = max(train_dates)
    min_val = min(val_dates)
    max_val = max(val_dates)
    min_test = min(test_dates)
    
    if max_train > min_val or max_val > min_test:
        raise ValueError(
            f"Temporal Leakage Detected! Train max: {max_train} > Val min: {min_val} "
            f"or Val max: {max_val} > Test min: {min_test}"
        )

    selected_game_ids = [g[0] for g in selected_games]
    
    # 3. Load PositionAnalysis rows for the selected games
    with engine.connect() as conn:
        pos_query = text("""
            SELECT pa.id, pa."gameId", pa."moveNumber", pa.fen, pa.move, 
                   pa."candidateMoves", pa."gamePhase"
            FROM "PositionAnalysis" pa
            WHERE pa."gameId" = ANY(:gids) AND pa."playerMove" = true
            ORDER BY pa."gameId", pa."moveNumber" ASC
        """)
        pos_rows = conn.execute(pos_query, {"gids": selected_game_ids}).fetchall()

    if not pos_rows:
        raise ValueError("No analyzed player positions found for selected games")

    peak_config = PeakTargetConfig()
    
    current_records = []
    peak_records = []
    
    current_ds_id = str(uuid.uuid4())
    peak_ds_id = str(uuid.uuid4())
    
    split_counts_current = {"TRAIN": 0, "VALIDATION": 0, "TEST": 0}
    split_counts_peak = {"TRAIN": 0, "VALIDATION": 0, "TEST": 0}
    
    positions_used = len(pos_rows)
    
    for row in pos_rows:
        pos_id = row[0]
        game_id = row[1]
        move_number = row[2]
        fen = row[3]
        actual_move = row[4]
        candidates_raw = row[5] or []
        game_phase = row[6] or "MIDDLEGAME"
        split = game_split_map.get(game_id, "TEST")
        
        if not candidates_raw:
            continue
            
        import chess
        try:
            board = chess.Board(fen)
            actual_uci = board.parse_san(actual_move).uci()
        except Exception:
            actual_uci = actual_move
            
        existing_moves = [c.get("move") for c in candidates_raw]
        if actual_uci not in existing_moves and actual_move not in existing_moves:
            candidates_raw.append({
                "move": actual_uci,
                "score": 0.0,
                "rank": len(candidates_raw) + 1,
                "cp_loss": 30.0
            })
            
        pos_feat = extract_position_features(fen, move_number, game_phase).model_dump()
        
        # Prepare candidate objects for Peak selection
        cand_features_list = []
        for c in candidates_raw:
            c_feat = extract_candidate_features(c).model_dump()
            c_feat["candidateMove"] = c.get("move")
            cand_features_list.append(c_feat)
            
        peak_target = select_peak_target(
            candidates=cand_features_list,
            position=pos_feat,
            player={},
            weakness={},
            config=peak_config
        )
        if not peak_target and candidates_raw:
            peak_target = candidates_raw[0].get("move")
        
        for c in candidates_raw:
            c_move = c.get("move")
            is_actual = (c_move == actual_uci or c_move == actual_move)
            is_peak = (c_move == peak_target) if peak_target else False
            
            c_feat = extract_candidate_features(c).model_dump()
            
            feat_payload = {
                "position": pos_feat,
                "candidate": c_feat,
                "player": {},
                "history": {},
                "weakness": {},
                "dna": None
            }
            
            meta_payload = {
                "featureVersion": "v1",
                "datasetVersion": dataset_version,
                "source": "Phase16_Retraining_Pipeline"
            }
            
            # CURRENT_SELF record
            rec_id_c = str(uuid.uuid4())
            current_records.append({
                "id": rec_id_c,
                "datasetId": current_ds_id,
                "userId": user_id,
                "gameId": game_id,
                "positionId": pos_id,
                "moveNumber": move_number,
                "split": split,
                "candidateMove": c_move,
                "actualMove": actual_move,
                "isActualMove": is_actual,
                "isPeakTarget": False,
                "peakScore": None,
                "features": json.dumps(feat_payload),
                "metadata": json.dumps(meta_payload),
                "createdAt": datetime.datetime.utcnow()
            })
            split_counts_current[split] += 1
            
            # PEAK_SELF record
            rec_id_p = str(uuid.uuid4())
            peak_records.append({
                "id": rec_id_p,
                "datasetId": peak_ds_id,
                "userId": user_id,
                "gameId": game_id,
                "positionId": pos_id,
                "moveNumber": move_number,
                "split": split,
                "candidateMove": c_move,
                "actualMove": actual_move,
                "isActualMove": is_actual,
                "isPeakTarget": is_peak,
                "peakScore": 1.0 if is_peak else 0.0,
                "features": json.dumps(feat_payload),
                "metadata": json.dumps(meta_payload),
                "createdAt": datetime.datetime.utcnow()
            })
            split_counts_peak[split] += 1

    # 4. Check if v2 datasets already exist (idempotency check)
    with engine.connect() as conn:
        existing_current = conn.execute(text("""
            SELECT id, "totalRecords" FROM "MLDataset"
            WHERE "userId" = :userId AND "datasetType" = 'CURRENT_SELF' AND version = :version
        """), {"userId": user_id, "version": dataset_version}).fetchone()
        
        existing_peak = conn.execute(text("""
            SELECT id, "totalRecords" FROM "MLDataset"
            WHERE "userId" = :userId AND "datasetType" = 'PEAK_SELF' AND version = :version
        """), {"userId": user_id, "version": dataset_version}).fetchone()
        
        if existing_current and existing_peak and existing_current[1] > 0 and existing_peak[1] > 0:
            return {
                "datasetVersion": dataset_version,
                "userId": user_id,
                "totalGames": total_games,
                "totalPositions": positions_used,
                "currentSelfDatasetId": existing_current[0],
                "peakSelfDatasetId": existing_peak[0],
                "splits": {
                    "train": {"games": train_count, "records": split_counts_current["TRAIN"], "startDate": str(min(train_dates)), "endDate": str(max_train)},
                    "validation": {"games": val_count, "records": split_counts_current["VALIDATION"], "startDate": str(min_val), "endDate": str(max_val)},
                    "test": {"games": test_count, "records": split_counts_current["TEST"], "startDate": str(min_test), "endDate": str(max(test_dates))}
                },
                "temporalAudit": {
                    "status": "PASSED",
                    "leakageDetected": False,
                    "trainMaxBeforeValMin": str(max_train) <= str(min_val),
                    "valMaxBeforeTestMin": str(max_val) <= str(min_test)
                }
            }

        existing_ds = conn.execute(text("""
            SELECT id FROM "MLDataset"
            WHERE "userId" = :userId AND version = :version
        """), {"userId": user_id, "version": dataset_version}).fetchall()
        
        for eds in existing_ds:
            conn.execute(text("""
                DELETE FROM "MLDatasetRecord" WHERE "datasetId" = :dsId
            """), {"dsId": eds[0]})
            conn.execute(text("""
                DELETE FROM "MLDataset" WHERE id = :dsId
            """), {"dsId": eds[0]})
        conn.commit()
            
        # Create CURRENT_SELF MLDataset
        conn.execute(text("""
            INSERT INTO "MLDataset" (
                id, "userId", "datasetType", version, "featureVersion", "targetVersion",
                "schemaVersion", "totalGames", "totalPositions", "totalRecords",
                "trainRecords", "validationRecords", "testRecords", "excludedRecords",
                status, statistics, "createdAt"
            ) VALUES (
                :id, :userId, 'CURRENT_SELF', :version, 'v1', 'v1',
                'v1', :totalGames, :totalPositions, :totalRecords,
                :trainRecords, :validationRecords, :testRecords, 0,
                'COMPLETED', :stats, NOW()
            )
        """), {
            "id": current_ds_id,
            "userId": user_id,
            "version": dataset_version,
            "totalGames": total_games,
            "totalPositions": positions_used,
            "totalRecords": len(current_records),
            "trainRecords": split_counts_current["TRAIN"],
            "validationRecords": split_counts_current["VALIDATION"],
            "testRecords": split_counts_current["TEST"],
            "stats": json.dumps({"split": split_counts_current, "windowGames": total_games})
        })
        
        # Create PEAK_SELF MLDataset
        conn.execute(text("""
            INSERT INTO "MLDataset" (
                id, "userId", "datasetType", version, "featureVersion", "targetVersion",
                "schemaVersion", "totalGames", "totalPositions", "totalRecords",
                "trainRecords", "validationRecords", "testRecords", "excludedRecords",
                status, statistics, "createdAt"
            ) VALUES (
                :id, :userId, 'PEAK_SELF', :version, 'v1', 'v1',
                'v1', :totalGames, :totalPositions, :totalRecords,
                :trainRecords, :validationRecords, :testRecords, 0,
                'COMPLETED', :stats, NOW()
            )
        """), {
            "id": peak_ds_id,
            "userId": user_id,
            "version": dataset_version,
            "totalGames": total_games,
            "totalPositions": positions_used,
            "totalRecords": len(peak_records),
            "trainRecords": split_counts_peak["TRAIN"],
            "validationRecords": split_counts_peak["VALIDATION"],
            "testRecords": split_counts_peak["TEST"],
            "stats": json.dumps({"split": split_counts_peak, "windowGames": total_games})
        })
        
        # Batch insert MLDatasetRecords (chunks of 1000)
        chunk_size = 1000
        insert_rec_sql = text("""
            INSERT INTO "MLDatasetRecord" (
                id, "datasetId", "userId", "gameId", "positionId", "moveNumber",
                split, "candidateMove", "actualMove", "isActualMove",
                "isPeakTarget", "peakScore", features, metadata, "createdAt"
            ) VALUES (
                :id, :datasetId, :userId, :gameId, :positionId, :moveNumber,
                :split, :candidateMove, :actualMove, :isActualMove,
                :isPeakTarget, :peakScore, CAST(:features AS jsonb), CAST(:metadata AS jsonb), :createdAt
            )
        """)
        
        for i in range(0, len(current_records), chunk_size):
            conn.execute(insert_rec_sql, current_records[i:i+chunk_size])
            
        for i in range(0, len(peak_records), chunk_size):
            conn.execute(insert_rec_sql, peak_records[i:i+chunk_size])
            
        conn.commit()

    return {
        "datasetVersion": dataset_version,
        "userId": user_id,
        "totalGames": total_games,
        "totalPositions": positions_used,
        "currentSelfDatasetId": current_ds_id,
        "peakSelfDatasetId": peak_ds_id,
        "splits": {
            "train": {"games": train_count, "records": split_counts_current["TRAIN"], "startDate": str(min(train_dates)), "endDate": str(max_train)},
            "validation": {"games": val_count, "records": split_counts_current["VALIDATION"], "startDate": str(min_val), "endDate": str(max_val)},
            "test": {"games": test_count, "records": split_counts_current["TEST"], "startDate": str(min_test), "endDate": str(max(test_dates))}
        },
        "temporalAudit": {
            "status": "PASSED",
            "leakageDetected": False,
            "trainMaxBeforeValMin": str(max_train) <= str(min_val),
            "valMaxBeforeTestMin": str(max_val) <= str(min_test)
        }
    }
