// ---------------------------------------------
// 1. Mock modules BEFORE importing app
// ---------------------------------------------
import { jest } from "@jest/globals";

// ---- Mock verifySession middleware ---- //
jest.unstable_mockModule("../middleware/verifySession.js", () => ({
  verifySession: (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }
}));

// ---- Mock DB layer (pgQuery + db()) ---- //
jest.unstable_mockModule("../config/db.js", () => ({
  pgQuery: jest.fn(async (query, values) => {
    if (query.includes("FROM accounts WHERE user_id")) {
      return {
        rows: [
          { id: "acc-1", account_type: "SAVINGS", balance: 1000 }
        ]
      };
    }
    if (query.includes("FROM accounts WHERE id")) {
      return {
        rows: [
          { user_id: "test-user-id", account_type: "SAVINGS", balance: 1000 }
        ]
      };
    }
    return { rows: [] };
  }),
  db: jest.fn(async () => ({ rows: [] })),
  pool: { end: jest.fn() },
  pgConnectTest: jest.fn(async () => true),
}));

// ---- Mock Redis ---- //
jest.unstable_mockModule("../utils/redisConnection.js", () => ({
  getRedisClient: async () => ({
    connect: async () => {},
    disconnect: async () => {},
    on: () => {}
  })
}));

// ---- Mock account service functions ---- //
jest.unstable_mockModule("../src/service/accountService.js", () => ({
  createAccountService: jest.fn(async () => true),
  getAccountByUser: jest.fn(async () => [{ id: "acc-1", balance:1000, account_type:'SAVINGS', currency:'INR' }]),
  fetchAccountDetails: jest.fn(async () => ({ id: "acc-1" })),
  fetchAllCardsService: jest.fn(async () => [{ card: "visa" }]),
  fetchCardDetailsService: jest.fn(async () => ({ cardId: "card-1" })),
  saveCardDetailsService: jest.fn(async () => ({ success: true })),
  deleteService: jest.fn(async () => true),
  isResourceActive: jest.fn(()=>({
    is_active:true
  })),
}));

// ---- Mock resource validator ---- //
jest.unstable_mockModule("../src/helpers/checkResourceStatus.js", () => ({
  checkResourceStatus: jest.fn(async () => ({
    ok: true,
    code: 200,
    message: "ok"
  }))
}));

// ---------------------------------------------
// IMPORT app AFTER mocks are registered
// ---------------------------------------------
const { app } = await import("../index.js");
import request from "supertest";

// ---------------------------------------------
// TEST SUITE
// ---------------------------------------------
describe("Account Service API", () => {

  // ---- 1. GET / ----
  it("GET / should return welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Welcome to the account-service");
  });

  // ---- 2. GET /api/v1/accounts ---- //
it("GET /api/v1/accounts should return user accounts", async () => {
  const res = await request(app).get("/api/v1/accounts/");

  // If it's still 500, log res.body to see the actual error message
  if (res.status === 500) console.log(res.body);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  
  // Based on your previous error, totals are likely calculated from the accounts
  expect(res.body).toHaveProperty("totals");
  expect(Array.isArray(res.body.accounts)).toBe(true);
});


  // ---- 3. POST /api/v1/accounts ---- //
  it("POST /api/v1/accounts should create account", async () => {
    const res = await request(app)
      .post("/api/v1/accounts/")
      .send({
        currencyCode: "USD",
        openingBalance: 100,
        totalIncome: 0,
        totalExpense: 0,
        accountType: "SAVINGS"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // ---- 4. GET /api/v1/accounts/:accountId ---- //
  it("GET /api/v1/accounts/:id should return account details", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/acc-1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("acc-1");
  });

  // ---- 5. DELETE /api/v1/accounts/:id ---- //
  it("DELETE /api/v1/accounts/:id should delete account", async () => {
    const res = await request(app)
      .delete("/api/v1/accounts/acc-1");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Account deleted successfully!");
  });

  // ---- 6. GET /api/v1/accounts/cards ---- //
  it("GET /api/v1/accounts/cards should return card list", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/cards");

    expect(res.status).toBe(200);
    expect(res.body.result.length).toBeGreaterThan(0);
  });

  // ---- 7. GET /api/v1/accounts/:accId/cards/:cardId ---- //
  it("GET /api/v1/accounts/:accId/cards/:cardId should return card details", async () => {
    const res = await request(app)
      .get("/api/v1/accounts/acc-1/cards/card-1");

    expect(res.status).toBe(200);
    expect(res.body.data.cardId).toBe("card-1");
  });

  // ---- 8. POST /api/v1/accounts/:accId/cards ---- //
  it("POST /api/v1/accounts/:accId/cards should save card", async () => {
    const res = await request(app)
      .post("/api/v1/accounts/acc-1/cards")
      .send({
        brand: "VISA",
        cardNumber: "123456789",
        holder_name: "Test User",
        expiry_month: 12,
        expiry_year: 2030
      });

    expect(res.status).toBe(201);
  });

  // ---- 9. DELETE /api/v1/accounts/:accId/cards/:cardId ---- //
  it("DELETE /api/v1/accounts/:accId/cards/:cardId should delete card", async () => {
    const res = await request(app)
      .delete("/api/v1/accounts/acc-1/cards/card-1");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Card details successfully deleted");
  });

});