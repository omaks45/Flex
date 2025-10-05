## Reviews API

### Endpoints

#### 1. Get All Reviews

- **GET** `/reviews`
- **Description:** Retrieve a list of all reviews.

**Response:**
```json
Status: 200 OK
[
    {
        "id": 1,
        "userId": 123,
        "listingId": 456,
        "rating": 5,
        "comment": "Great place!",
        "createdAt": "2024-06-01T12:00:00Z"
    }
]
```

---

#### 2. Get Review by ID

- **GET** `/reviews/{id}`
- **Description:** Retrieve a specific review by its ID.

**Response:**
```json
Status: 200 OK
{
    "id": 1,
    "userId": 123,
    "listingId": 456,
    "rating": 5,
    "comment": "Great place!",
    "createdAt": "2024-06-01T12:00:00Z"
}
```
- **Status Codes:**
    - `200 OK` – Success
    - `404 Not Found` – Review not found

---

#### 3. Create Review

- **POST** `/reviews`
- **Description:** Create a new review.

**Request:**
```json
{
    "userId": 123,
    "listingId": 456,
    "rating": 4,
    "comment": "Nice experience"
}
```

**Response:**
```json
Status: 201 Created
{
    "id": 2,
    "userId": 123,
    "listingId": 456,
    "rating": 4,
    "comment": "Nice experience",
    "createdAt": "2024-06-02T10:00:00Z"
}
```
- **Status Codes:**
    - `201 Created` – Review created
    - `400 Bad Request` – Invalid input

---

#### 4. Update Review

- **PUT** `/reviews/{id}`
- **Description:** Update an existing review.

**Request:**
```json
{
    "rating": 5,
    "comment": "Updated comment"
}
```

**Response:**
```json
Status: 200 OK
{
    "id": 1,
    "userId": 123,
    "listingId": 456,
    "rating": 5,
    "comment": "Updated comment",
    "createdAt": "2024-06-01T12:00:00Z"
}
```
- **Status Codes:**
    - `200 OK` – Review updated
    - `404 Not Found` – Review not found

---

#### 5. Delete Review

- **DELETE** `/reviews/{id}`
- **Description:** Delete a review by its ID.

**Response:**
```json
Status: 204 No Content
```
- **Status Codes:**
    - `204 No Content` – Review deleted
    - `404 Not Found` – Review not found

---