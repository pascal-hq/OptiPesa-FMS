OptiPesa – Financial & Operations Management System

OptiPesa is a web-based system designed to help businesses manage their sales, expenses, employees, departments, and analytics in one centralized platform.

It provides real-time insights into business performance through dashboards and charts, making decision-making easier and more efficient.

---

🚀 Features

- 📊 Dashboard Analytics – View total sales, expenses, and profit
- 💰 Sales Management – Record and track daily sales
- 📁 Transaction History – View all financial activities
- 🏢 Department Management – Organize business units
- 👨‍💼 Employee Management – Manage staff records
- 🧾 Expense Tracking – Record and monitor expenses
- 📈 Interactive Charts – Visualize financial data
- 🔐 Authentication System – Secure login with JWT

---

🛠️ Tech Stack

Frontend

- HTML
- CSS
- JavaScript
- Chart.js

Backend

- Django
- Django REST Framework (DRF)
- JWT Authentication

Database

- SQLite (Development)

---

📦 Installation & Setup

1. Clone the repository

git clone https://github.com/pascal-hq/optipesa.git
cd optipesa

---

2. Backend Setup

cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

---

3. Frontend Setup

Open the frontend folder and run using Live Server or simply open:

index.html

---

🔑 Authentication

The system uses JWT (JSON Web Tokens) for authentication:

- Login to receive access & refresh tokens
- Tokens are stored in localStorage
- Automatic token refresh is handled in "api.js"

---

📊 System Modules

Dashboard

Displays summaries and charts for business performance.

Sales

Allows users to record and manage sales transactions.

Transactions

Shows a full history of all recorded activities.

Employees

Manage staff information and roles.

Departments

Organize employees and operations into departments.

Expenses

Track outgoing business costs.

---

🧠 How It Works

1. User logs into the system
2. JWT token is stored locally
3. All API requests use the token for authentication
4. Data is fetched from the backend and displayed dynamically
5. Charts update automatically based on data

---
 Dashboard
<img width="1885" height="944" alt="image" src="https://github.com/user-attachments/assets/50e3ceb1-28a5-4f74-bf40-53936ad219a3" />
Record Sale
<img width="1894" height="750" alt="image" src="https://github.com/user-attachments/assets/35ede5a1-4fa8-42b4-afd3-db6a2dac0976" />
Transactions
<img width="1875" height="905" alt="image" src="https://github.com/user-attachments/assets/d4456bdb-081e-409b-a627-1862b0a21cef" />
Departments
<img width="1913" height="763" alt="image" src="https://github.com/user-attachments/assets/65f211f8-14c3-43ee-8c39-48cf3df0d6be" />
Employees
<img width="1881" height="937" alt="image" src="https://github.com/user-attachments/assets/c584c4f6-3aa1-4229-85b5-66c59534ec84" />
Services
<img width="1882" height="921" alt="image" src="https://github.com/user-attachments/assets/10a18127-0a04-4649-b426-a6b83331764b" />
Expenses
<img width="1871" height="910" alt="image" src="https://github.com/user-attachments/assets/9dda5ea7-b30e-47f0-a121-e9261337d618" />
Analytics
<img width="1878" height="893" alt="image" src="https://github.com/user-attachments/assets/a4f6a201-563a-4f76-8902-9a0e0109fe80" />
---
🔮 Future Improvements

- Edit & delete functionality for all modules
- Role-based access control (Admin, Manager, Staff)
- Export reports (PDF/Excel)
- Mobile responsiveness improvements
- Notifications system
- Safaricom Mpesa intergration 

---

🤝 Contributing

Contributions are welcome!

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to GitHub
5. Open a Pull Request

---

📄 License

## 📄 License

© 2026 Pascal Muthama. All Rights Reserved.  

You may not copy, modify, distribute, or use this software without explicit permission.  
Commercial rights are reserved by the author.

---

👨‍💻 Author

Pascal Muthama

- Software Development Student
- Passionate about Data Analysis & Systems Development

---

⭐ Support

If you like this project, give it a ⭐ on GitHub!
