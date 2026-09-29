export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Chess Evolve API",
    version: "1.0.0",
    description: "Production OpenAPI specification for Chess Evolve - AI Chess Evolution Platform",
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1 Endpoint",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register new Chess Evolve user account",
        responses: { "201": { description: "User registered successfully" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "User login",
        responses: { "200": { description: "Login successful" } },
      },
    },
    "/chess/profile/connect": {
      post: {
        summary: "Connect Chess.com profile",
        responses: { "200": { description: "Profile connected" } },
      },
    },
    "/chess/sync": {
      post: {
        summary: "Start asynchronous game synchronization",
        responses: { "202": { description: "Sync job queued" } },
      },
    },
    "/games": {
      get: {
        summary: "Fetch paginated imported games",
        responses: { "200": { description: "List of games" } },
      },
    },
    "/dna/current": {
      get: {
        summary: "Get current Chess DNA version and metrics",
        responses: { "200": { description: "Chess DNA data" } },
      },
    },
    "/peak-self": {
      get: {
        summary: "Get current Peak Self configuration",
        responses: { "200": { description: "Peak Self profile" } },
      },
    },
    "/play/sessions": {
      post: {
        summary: "Create play session against Current Self or Peak Self",
        responses: { "201": { description: "Session started" } },
      },
    },
    "/training/recommendations": {
      get: {
        summary: "Get personalized weakness training recommendations",
        responses: { "200": { description: "Training recommendations" } },
      },
    },
    "/coach/chat": {
      post: {
        summary: "Query AI Coach on stored chess metrics",
        responses: { "200": { description: "Coach response" } },
      },
    },
    "/dashboard": {
      get: {
        summary: "Fetch lightweight dashboard overview data",
        responses: { "200": { description: "Dashboard overview" } },
      },
    },
    "/evolution": {
      get: {
        summary: "Fetch historical evolution timeline",
        responses: { "200": { description: "Evolution timeline" } },
      },
    },
  },
};
