# Meal Planner App

A shareable meal planning app for couples/households.

## Features

- Google sign in
- Household code sharing
- Weekly meal planner
- Breakfast, lunch, dinner, snack sections
- Saved recipes
- Grocery list
- Grocery suggestions pulled from planned meal ingredients
- Realtime spouse sync through Firebase Firestore
- Mobile-friendly layout

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Firebase project

Go to Firebase Console and create a project.

Enable:

- Authentication > Google provider
- Firestore Database

### 3. Add environment variables

Copy `.env.example` to `.env` and paste in your Firebase app config.

```bash
cp .env.example .env
```

### 4. Run locally

```bash
npm run dev
```

Open the local URL Vite gives you.

## How sharing works

1. You sign in and create a household.
2. The app gives you a household code.
3. Your spouse signs in and joins using that code.
4. Both of you can add/edit meals and groceries in realtime.

## Firestore collections

- `households`
- `meals`
- `recipes`
- `groceryItems`

## Suggested Firestore rules for starter/testing

These are simple and not production-hardened yet.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For production, lock records to household members only.
