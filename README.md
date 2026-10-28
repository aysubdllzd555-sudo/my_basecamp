# Welcome to My Basecamp 1
***

## Task
The goal of this project is to build the first step of MyBasecamp, a small project management web application. It needs a database, a backend and a frontend, and the user experience has to be clear and pleasant. The application has to support four things:
User registration. A user can open the sign up page (new), see a user (show), create an account (create) and delete an account (destroy).
Sessions. A user can sign in and sign out.
Role permissions. There are two roles, user and admin. An admin can give the admin role to another user (setAdmin) and take it away again (removeAdmin).
Projects. A signed in user can open the new project page (new), see a project (show), change it (edit) and delete it (destroy).
The first page of the application only offers Sign in and Sign up, and every other page opens after the user presses a button.
## Description
The project follows the MVC pattern (Model, View, Controller) and uses an ORM. The backend is written with Node.js and Express. Database access is done with Sequelize, an ORM, on top of an SQLite database file that is created automatically on the first start. No SQL is written by hand: the tables are described as models, and all reading and writing goes through model methods.
Project structure:
models: User.js and Project.js describe the tables with Sequelize. models/index.js connects them: a user has many projects and a project belongs to a user. When a user is deleted, that user's projects are deleted too (ON DELETE CASCADE).
controllers: authController.js (sign up, sign in, sign out, current user), userController.js (list, show, delete, set admin, remove admin) and projectController.js (list, show, create, update, delete). They contain the application logic and the validation.
routes: authRoutes.js, userRoutes.js and projectRoutes.js connect the URLs to the controller functions.
middlewares: auth.js checks that the user is signed in and that the user is an admin. errors.js contains the shared error handling.
config: database.js creates the Sequelize connection.
view: the frontend (index.html, style.css, app.js). This is the View of the application.
server.js starts Express, the session, the routes and the database.
Passwords are never stored as plain text. They are hashed with bcryptjs before they are saved. Sessions are handled with express-session, and the session cookie is HttpOnly.
The rules are checked on the server, not only in the browser. The first account that is registered becomes the admin. Only an admin can set or remove the admin role. A project can be edited or deleted only by its owner or by an admin. An account can be deleted only by its owner or by an admin. The last remaining admin cannot be deleted and cannot lose the admin role, so the application never ends up without an admin. Input is validated: the email must look like an email, the password must be 6 to 72 characters long, and the project title is required and has a maximum length.
The frontend lives in the view folder and uses exactly three files: index.html, style.css and app.js. It is written in plain HTML, CSS and JavaScript without any framework. All pages (home, sign in, sign up, projects, project details, new and edit project, users, user details) are inside index.html, and app.js shows only one of them at a time, depending on the address after the # sign in the browser. The JavaScript talks to the backend with the fetch function, checks the session when the page opens and sends visitors who are not signed in to the sign in page. Text written by users is escaped before it is shown, delete actions ask for confirmation in a dialog, and short messages tell the user what happened.
The API endpoints are:
POST /api/signup, POST /api/signin, POST /api/signout, GET /api/current_user
GET /api/users, GET /api/users/:id, DELETE /api/users/:id
PUT /api/users/:id/set_admin, PUT /api/users/:id/remove_admin
GET /api/projects, GET /api/projects/:id, POST /api/projects, PUT /api/projects/:id, DELETE /api/projects/:id
The file test.js is a small script that checks all of these endpoints, including the permission rules.
## Installation
To run this project you need Node.js, version 18 or newer, which also installs npm, the tool that downloads the packages the project depends on. You can check that they are installed by running the node and npm commands with the version option in a terminal. You do not need to install a database program, because the project uses SQLite, which keeps all data in a single file that is created automatically inside the project folder the first time the server starts. You also do not need any special editor. Visual Studio Code is convenient because it has a built in terminal, but any terminal works.
First get the project onto your computer by cloning the repository or by downloading it and unpacking it. Then open a terminal inside the project folder, which is the folder that contains the files server.js and package.json. This detail is important: if the terminal is opened in a different folder, for example one level above, the next commands will not find the project. Inside that folder run the npm install command once. It reads package.json and downloads the required packages into a new folder called node_modules. The packages are express (the web server), express-session (sign in sessions), sequelize (the ORM), sqlite3 (the database driver) and bcryptjs (password hashing). The node_modules folder and the database file are not stored in the repository, so every person who gets the project has to run this command on their own computer.
## Usage
Start the application by running the command node server.js in the project folder. When everything is fine, the terminal prints a line with the address http://localhost:3000, and the terminal stays busy because the server keeps running. Open that address in a web browser. Do not open index.html by double clicking it and do not use the Live Server extension of VS Code, because the page has to be served by the Node.js server, otherwise the buttons cannot reach the backend and nothing will work. To stop the server, click on the terminal and press Control and C together. If the terminal says that port 3000 is already in use, an older copy of the server is still running; stop it, or start the server with the PORT environment variable set to another number, for example 3001, and open that port in the browser instead.
The first page shows the name My Basecamp with two buttons, Sign in and Sign up. Press Sign up, enter a name, an email and a password of at least six characters, repeat the password and send the form. The very first account that is created in a new database automatically becomes the admin. After signing up you are signed in and the projects page opens. At the top of the pages there is a bar with the links Projects and Users and a Sign out button.
On the projects page you can switch between two tabs: All projects shows every project, and Created by me shows only your own projects. Press New project to open a form with a title and a description, and save it to create a project. Each project is shown as a card with the title and the owner name on top, the description in the middle, and the buttons View, Edit and Delete at the bottom. Edit and Delete appear only on projects that you own, or on every project if you are an admin. Delete always asks for confirmation first. View opens a page with the full project details.
The Users link shows all accounts with their roles. Opening a user shows the name, the email and the role. On your own page you can delete your own account, which also deletes all of your projects. If you are an admin, you also see buttons to make a user an admin, to remove the admin role from a user, and to delete any user. The application does not allow the last admin to be deleted or to lose the admin role. Press Sign out in the top bar to end the session.
To test the backend automatically, stop the server, delete the file basecamp.db so that the database is empty, start the server again and open a second terminal in the same project folder. Run the command node test.js there. The script creates three test users, tries every action, including the actions that must be refused, and prints PASS or FAIL for each check and a summary at the end.
```
./my_project My_Basecamp
```

### The Core Team
abdullaz_a

<span><i>Made at <a href='https://qwasar.io'>Qwasar SV -- Software Engineering School</a></i></span>
<span><img alt='Qwasar SV -- Software Engineering School's Logo' src='https://storage.googleapis.com/qwasar-public/qwasar-logo_50x50.png' width='20px' /></span>