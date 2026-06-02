+# User Authentication API

This API provides a user authentication system with endpoints for login, registration, password reset, and Email verification. Below is a guide on how to set up and use the API.

---

## **API Endpoints**

### 1. **Verify User**
- **URL:** `http://localhost:8080/users/verifyuser`
- **Method:** `POST`
- **Description:** Verifies a user's account using a token.

### 2. **Logout**
- **URL:** `http://localhost:8080/users/logout`
- **Method:** `GET`
- **Description:** Logs out a user by clearing their authentication token.

### 3. **Reset Password**
- **URL:** `http://localhost:8080/users/resetpassword?token=yourtoken`
- **Method:** `POST`
- **Description:** Resets the user’s password using a token sent via email.

### 4. **Forgot Password**
- **URL:** `http://localhost:8080/users/forgotpassword`
- **Method:** `POST`
- **Description:** Sends a password reset link to the user's email.

### 5. **Login**
- **URL:** `http://localhost:8080/users/login`
- **Method:** `POST`
- **Description:** Authenticates a user and provides a JWT token.

### 6. **Sign In**
- **URL:** `http://localhost:8080/users/signin`
- **Method:** `POST`
- **Description:** Registers a new user.

---

## **Setup Instructions**

### **1. Clone the Repository**
```bash
git clone https://github.com/mateen-mahi/complete-auth-in-express
cd express-project
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure Environment Variables**
Create a `.env` file in the root directory and add the following environment variables:

```env
MONGO_URI = Enter URIL
JWT_SECRET = ..............
Port = 8080
MAIL_TRAP_TOKEN = create accound on mailtrap and paste token here
FRONTEND_URI = https://www.google.com
NODE_ENV = development
```

### **4. Run the Server**
```bash
npm start
```
- The server will start at `http://localhost:8080`.

---

## **How to Use the API**

### **Step 1: Register (Sign In)**
- Use the `/signin` endpoint to create a new user.
- Example request body:
```json
{
  "username": "name here",
  "email": "example@gmail.com",
  "password": "123456",
  "gender": "male"
}
```

### **Step 2: Login**
- Use the `/login` endpoint to authenticate the user.
- Example request body:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
- The response will include a JWT token that is stored in a cookie.

### **Step 3: Verify User**
- After registration, a token will be sent via email. Use the `/verifyuser` endpoint to verify the user's account.

### **Step 4: Forgot Password**
- If a user forgets their password, use the `/forgotpassword` endpoint to send a reset link to their email.
- Example request body:
```json
{
  "email": "user@example.com"
}
```

### **Step 5: Reset Password**
- Use the `/resetpassword` endpoint with the token sent to the user's email to reset their password.
- Example request body:
```json
{
  "password": "newsecurepassword"
}
```

### **Step 6: Logout**
- Use the `/logout` endpoint to clear the user's authentication token.

---

## **Best Practices**
- **Environment Variables:** Never hard-code sensitive information like `JWT_SECRET` or `MONGO_URI` in your code. Always use environment variables.
- **Secure Cookies:** Ensure `secure: true` is used for cookies in production environments.
- **Validation:** Validate user input to prevent security vulnerabilities such as SQL injection.
- **HTTPS:** Use HTTPS in production to ensure secure communication.

---

## **Dependencies**
- **Express:** Web framework for building APIs.
- **Mongoose:** MongoDB object modeling for Node.js.
- **bcrypt:** For hashing and verifying passwords.
- **jsonwebtoken (JWT):** For generating and verifying authentication tokens.
- **dotenv:** For managing environment variables.
- **cookie-parser:** For handling cookies.
- **nodemailer:** For sending emails (Mailtrap is used for testing).

---

## **Support**
If you have any questions or issues, feel free to contact the repository maintainer or raise an issue in the repository.

---

**Contact +923041418406 ** 
