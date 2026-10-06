import { CoachService } from '../src/services/coach/CoachService.js';
import { prisma } from '../src/utils/prisma.js';

async function testCoach() {
  const userId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';
  console.log('Testing CoachService.getInsights for', userId);
  const insights = await CoachService.getInsights(userId);
  console.log('Coach Insights:', JSON.stringify(insights, null, 2));

  console.log('Testing CoachService.handleChat with a question...');
  const chatReply = await CoachService.handleChat(userId, "What is my biggest weakness and how can I fix it?");
  console.log('Coach Reply:', chatReply.response?.slice(0, 200) + '...');
}

testCoach().catch(console.error).finally(() => prisma.$disconnect());
