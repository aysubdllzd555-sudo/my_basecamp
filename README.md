# Welcome to My Basecamp 1
***

## Task
The goal of this project is to build the first step of MyBasecamp, a small project management web application with a database, a backend and a frontend. The application has to support four things:

User registration. A user can open the sign up page (new), see a user (show), create an account (create) and delete an account (destroy).
Sessions. A user can sign in and sign out.
Role permissions. There are two roles, user and admin. An admin can give the admin role to another user (setAdmin) and take it away again (removeAdmin).
Projects. A signed in user can open the new project page (new), see a project (show), change it (edit) and delete it (destroy).
The user experience has to be clear and pleasant: the first page only offers Sign in and Sign up, and every other page opens after the user presses a button.


## Description
The backend is written with Node.js and Express. Data is stored in an SQLite database file that is created automatically on the first start. There are two tables: users (name, email, hashed password, admin flag) and projects (title, description, owner, creation date). Projects belong to a user, and when a user is deleted all of that user's projects are deleted with them through a foreign key with ON DELETE CASCADE.
Passwords are never stored as plain text. They are hashed with bcryptjs before they are saved. Sessions are handled with express-session, and the session cookie is HttpOnly. All SQL queries use placeholders, so user input is never put directly into a query.
The rules are checked on the server, not only in the browser. The first account that is registered becomes the admin. Only an admin can set or remove the admin role. A project can be edited or deleted only by its owner or by an admin. An account can be deleted only by its owner or by an admin. The last remaining admin cannot be deleted and cannot lose the admin role, so the application never ends up without an admin. Input is validated: the email must look like an email, the password must be 6 to 72 characters long, the project title is required and has a maximum length.
The frontend lives in the view folder and uses exactly three files: index.html, style.css and app.js. It is written in plain HTML, CSS and JavaScript without any framework. The pages (home, sign in, sign up, projects, project details, new and edit project, users, user details) are all inside index.html, and app.js shows only one of them at a time depending on the address after the # sign in the browser. The JavaScript talks to the backend with the fetch function, checks the session when the page opens and sends visitors who are not signed in to the sign in page. Text from users is escaped before it is shown, delete actions ask for confirmation in a dialog, and short messages tell the user what happened.
The API endpoints are:
POST /api/signup, POST /api/signin, POST /api/signout, GET /api/current_user
GET /api/users, GET /api/users/:id, DELETE /api/users/:id
PUT /api/users/:id/set_admin, PUT /api/users/:id/remove_admin
GET /api/projects, GET /api/projects/:id, POST /api/projects, PUT /api/projects/:id, DELETE /api/projects/:id
The file test.js is a small script that checks all of these endpoints, including the permission rules.
## Installation
TODO - How to install your project? npm install? make? make re?

## Usage
TODO - How does it work?
Start the server by running node server.js in the project folder. When it is ready, the terminal prints the address http://localhost:3000. Open this address in a web browser. If port 3000 is already used by another program, start the server with the PORT environment variable set to another number, for example 3001, and open that port instead.
Do not open index.html by double clicking it and do not use VS Code Live Server for the frontend. The page must be opened through the Node.js server, otherwise the buttons cannot reach the backend and nothing will work.
On the first page press Sign up and create an account. The first account that is created automatically becomes the admin. After signing up you are signed in and you see the projects page. There you can switch between All projects and Created by me, press New project to create a project, and use View, Edit and Delete on each project card. The Users link in the top bar shows all accounts. Opening a user shows the details, and an admin sees buttons to make that user an admin, remove the admin role or delete the user. Every user can delete their own account from their own user page. Sign out is in the top bar.
To check the backend automatically, stop the server, delete the basecamp.db file so the database is empty, start the server again and run node test.js in a second terminal. The script prints PASS or FAIL for every check and a summary at the end.
```
./my_project My_Basecamp
```

### The Core Team
abdullaz_a

<span><i>Made at <a href='https://qwasar.io'>Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt='Qwasar SV -- Software Engineering School's Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>