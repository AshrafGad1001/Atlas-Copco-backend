# Testing Guide

## Backend Tests (Jest)
To run backend tests locally, you need a local MongoDB instance.
Set `MONGO_URI_TEST` in your `.env` file to a database ending in `_test`.

Run all tests:
```bash
cd atlas-copco-backend
npm test -- --runInBand
```

## Frontend E2E Tests (Playwright)
To run frontend tests, the backend must be running locally on port 5000 with the test database, and the frontend must be running on port 3000.

Run E2E tests:
```bash
cd atlas-copco-client
npm run test:e2e
```

## Check Encoding
```bash
npm run check:encoding
```
