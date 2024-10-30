const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Create a new SQLite database (or open it if it exists)
const db = new sqlite3.Database("./todo.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the SQLite database.");
    // Create the tasks table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0
        )`);
  }
});

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Method override middleware
app.use((req, res, next) => {
  console.log("Method before:", req.method);
  console.log("Headers:", req.headers["x-http-method-override"]);
  if (req.headers["x-http-method-override"] === "PUT") {
    req.method = "PUT";
    console.log("Method after:", req.method);
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  db.all(`SELECT * FROM tasks`, [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.render("index", { tasks: rows });
  });
});

app.post("/add", (req, res) => {
  const task = req.body.task;
  if (task) {
    db.run(`INSERT INTO tasks (task) VALUES (?)`, [task], function (err) {
      if (err) {
        return console.log(err.message);
      }
      // Get the new task list
      db.all(`SELECT * FROM tasks`, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.render("tasks", { tasks: rows });
      });
    });
  }
});

app.post("/delete/:id", (req, res) => {
  const taskId = req.params.id;
  db.run(`DELETE FROM tasks WHERE id = ?`, taskId, function (err) {
    if (err) {
      return console.log(err.message);
    }
    // Get the updated task list
    db.all(`SELECT * FROM tasks`, [], (err, rows) => {
      if (err) {
        throw err;
      }
      res.render("tasks", { tasks: rows });
    });
  });
});

// Replace your existing edit route with this PUT route
app.put("/edit/:id", (req, res) => {
  const taskId = req.params.id;
  const updatedTask = req.body.task;

  db.run(
    `UPDATE tasks SET task = ? WHERE id = ?`,
    [updatedTask, taskId],
    function (err) {
      if (err) {
        return console.log(err.message);
      }
      // Get the updated task list
      db.all(`SELECT * FROM tasks`, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.render("tasks", { tasks: rows });
      });
    }
  );
});

// Add a new route to toggle completion
app.post("/toggle/:id", (req, res) => {
  const taskId = req.params.id;
  db.run(
    `UPDATE tasks SET completed = NOT completed WHERE id = ?`,
    [taskId],
    function (err) {
      if (err) {
        return console.log(err.message);
      }
      db.all(`SELECT * FROM tasks`, [], (err, rows) => {
        if (err) {
          throw err;
        }
        res.render("tasks", { tasks: rows });
      });
    }
  );
});

// Close the database connection when the app is closed
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Closed the database connection.");
  });
  process.exit(0);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
