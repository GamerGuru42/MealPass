# MealPass — API Boundaries & Route Specifications

> **Version:** 1.0.0  
> **Last Updated:** 2026-10-30  
> **Author:** NextGen Technologies  
> **Client:** Cosmopolitan University  

---

## 1. Authentication & Session Endpoints

### 1.1 User Login
- **Method:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "student@cosmopolitan.edu.ng",
    "password": "SecurePassword123!",
    "universitySlug": "cosmopolitan"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "uuid",
      "email": "student@cosmopolitan.edu.ng",
      "firstName": "Amina",
      "lastName": "Ibrahim",
      "roles": ["STUDENT"],
      "university": {
        "id": "uuid",
        "name": "Cosmopolitan University",
        "slug": "cosmopolitan",
        "primaryColor": "#1e3a5f"
      }
    }
  }
  ```

---

## 2. Student Endpoints

### 2.1 Get Current Student Profile & Feeding Balance
- **Method:** `GET /api/students/me`
- **Access:** `STUDENT`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "studentProfile": {
        "id": "uuid",
        "matricNumber": "CU/2024/0142",
        "department": "Software Engineering",
        "level": "300L",
        "isFeedingActive": true,
        "hasPinConfigured": true
      },
      "feedingAccount": {
        "id": "uuid",
        "isActive": true,
        "currentBalance": 18700.00,
        "currency": "NGN"
      }
    }
  }
  ```

### 2.2 Configure or Update Transaction PIN
- **Method:** `POST /api/students/me/pin`
- **Access:** `STUDENT`
- **Request Body:**
  ```json
  {
    "currentPin": "1234", // optional on initial setup
    "newPin": "5678",
    "confirmPin": "5678"
  }
  ```

---

## 3. Menu Endpoints

### 3.1 Get Cafeteria Menu
- **Method:** `GET /api/menu?cafeteriaId={uuid}`
- **Access:** Public / Authenticated
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "cafeteria": {
        "id": "uuid",
        "name": "Main Campus Cafeteria",
        "location": "Student Centre, Ground Floor"
      },
      "categories": [
        {
          "id": "uuid",
          "name": "Main Dishes",
          "displayOrder": 1,
          "items": [
            {
              "id": "uuid",
              "name": "Jollof Rice (Special)",
              "description": "Party style jollof rice served with plantain",
              "imageUrl": null,
              "currentPrice": 1200.00,
              "isAvailable": true
            }
          ]
        }
      ]
    }
  }
  ```

### 3.2 Create or Update Menu Item
- **Method:** `POST /api/cafeteria/menu/items` / `PATCH /api/cafeteria/menu/items/{id}`
- **Access:** `CAFETERIA_HEAD`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "Fried Rice & Coleslaw",
    "description": "Signature stir fried rice",
    "categoryId": "uuid",
    "price": 1500.00,
    "isAvailable": true,
    "reason": "Inflation adjustment / Semester repricing"
  }
  ```

---

## 4. Order Management Endpoints

### 4.1 Place Pre-Order (Atomic Balance Deduction)
- **Method:** `POST /api/orders`
- **Access:** `STUDENT`
- **Request Body:**
  ```json
  {
    "cafeteriaId": "uuid",
    "items": [
      { "menuItemId": "uuid-1", "quantity": 1 },
      { "menuItemId": "uuid-2", "quantity": 2 }
    ],
    "pin": "5678",
    "notes": "Extra pepper on the side please"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "order": {
        "id": "uuid",
        "orderNumber": "MP-2026-00042",
        "status": "PLACED",
        "totalAmount": 2500.00,
        "pickupCode": "X7K9P2",
        "pickupQrToken": "e4f0a9128bcde9920194...",
        "placedAt": "2026-10-30T12:45:00Z"
      },
      "receipt": {
        "transactionId": "uuid",
        "previousBalance": 18700.00,
        "amountDeducted": 2500.00,
        "newBalance": 16200.00
      }
    }
  }
  ```

### 4.2 Update Order Fulfillment Status
- **Method:** `PATCH /api/orders/{id}/status`
- **Access:** `CAFETERIA_STAFF`, `CAFETERIA_HEAD`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "newStatus": "READY" // ACCEPTED, PREPARING, READY, RECEIVED, CANCELLED
  }
  ```

### 4.3 Verify Pickup via QR Code or Pickup Code
- **Method:** `POST /api/cafeteria/orders/verify-pickup`
- **Access:** `CAFETERIA_STAFF`, `CAFETERIA_HEAD`
- **Request Body:**
  ```json
  {
    "pickupQrToken": "e4f0a9128bcde9920194...",
    // OR
    "pickupCode": "X7K9P2",
    "cafeteriaId": "uuid"
  }
  ```

### 4.4 Madam / Manual Override Pickup Confirmation
- **Method:** `POST /api/cafeteria/orders/{id}/manual-received`
- **Access:** `CAFETERIA_HEAD`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "reason": "Student phone battery died; student verified in person via physical matric card"
  }
  ```

---

## 5. Ledger & Finance Administration Endpoints

### 5.1 Allocate Feeding Funds to Student
- **Method:** `POST /api/admin/allocations`
- **Access:** `FINANCE_ADMIN`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "studentProfileId": "uuid",
    "amount": 50000.00,
    "feedingPeriodId": "uuid-semester-1",
    "description": "2026/2027 1st Semester Feeding Clearance Credit",
    "bankReference": "NIBSS-REV-9021941"
  }
  ```

### 5.2 Query Authoritative Transaction Ledger
- **Method:** `GET /api/transactions`
- **Access:** `STUDENT` (own records only), `FINANCE_ADMIN`, `SUPER_ADMIN`
- **Query Parameters:**
  - `page`: default 1
  - `limit`: default 20
  - `startDate`: ISO 8601
  - `endDate`: ISO 8601
  - `type`: `ALLOCATION` | `MEAL_DEDUCTION` | `REFUND` | `REVERSAL` | `ADJUSTMENT`
  - `studentId`: optional for admins

