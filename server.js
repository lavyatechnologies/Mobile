require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

//AdminPanal

app.post("/InsertLoginToAdmin", async (req, res) => {
  const { Name, Phone, Password, ValidityDate ,StaffCount} = req.body;

  if (!Name || !Phone || !Password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [rows] = await pool.query("CALL InsertLoginToAdmin(?, ?,?,?,?)", [
      Name,
      Phone,
      Password,
      ValidityDate,
      StaffCount,
    ]);
    res.json({ message: "User inserted successfully", data: rows });
  } catch (error) {
    console.error("Error inserting user:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Phone number already exists" });
    }
    res.status(500).json({ error: "Failed to save user" });
  }
});
//getUserall
app.get("/getUser", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const sql = "CALL getUser()";
    const [rows] = await connection.query(sql); // No parameters passed

    connection.release();

    res.status(200).json({
      success: true,
      data: rows[0], // rows[0] contains the result set
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve logins",
      error: error.message,
    });
  }
});
//updateUsertoAdmin
app.put("/UpdateUser", async (req, res) => {
  const { LoginID, Name, Phone, Password, ValidityDate,StaffCount } = req.body;

  if (!LoginID || !Name || !Phone || !Password || !ValidityDate ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Procedure ko 5 parameters ke saath call karo
    const sql = "CALL UpdateUser(?, ?, ?, ?, ?,?)";
    await pool.query(sql, [LoginID, Name, Phone, Password, ValidityDate,StaffCount]);

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating user:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    res.status(500).json({ message: "Failed to update user" });
  }
});
//admindeletefor user
// Delete user by LoginID
app.delete("/DeleteUser/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "LoginID is required" });
  }

  try {
    const sql = "CALL DeleteUser(?)";
    await pool.query(sql, [id]);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting User:", err);
    res.status(500).json({ success: false, message: "Failed to delete User" });
  }
});

app.post("/InsertLogin", async (req, res) => {
  const { Name, Phone, Password } = req.body;

  if (!Name || !Phone || !Password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [rows] = await pool.query("CALL InsertLogin(?, ?, ?)", [
      Name,
      Phone,
      Password,
    ]);
    res.json({ message: "User inserted successfully", data: rows });
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).json({ error: "Failed to save user" });
  }
});


//check login
app.post("/checklogin", async (req, res) => {
  const { Phone, Password } = req.body;

  if (!Phone || !Password) {
    return res.status(400).json({ success: false, message: "Phone and Password are required" });
  }

  try {
    const [rows] = await pool.query("CALL CheckLogin(?, ?)", [Phone, Password]);
    const user = rows[0]?.[0];

    if (!user) {
      return res.json({ success: false, code: "NOT_FOUND", message: "Account not found" });
    }

    // ✅ ab yaha expiry check karega
    if (user.ValidityDate && new Date(user.ValidityDate) < new Date()) {
      return res.json({ success: false, code: "EXPIRED", message: "Your account has expired" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error executing procedure:", error);
    res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Database error" });
  }
});


//checkstafflogin
app.post("/checkStaffLoginID", async (req, res) => {
  const { StaffID, Password } = req.body;

  if (!StaffID || !Password) {
    return res.status(400).json({ error: "StaffID and Password are required" });
  }

  try {
    const [rows] = await pool.query("CALL checkStaffLoginID(?, ?)", [
      StaffID,
      Password,
    ]);

    // Procedure returns SELECT result
    if (rows[0].length > 0 && rows[0][0].fLoginID) {
      const staff = rows[0][0];

      // Check expiry
      if (staff.ValidityDate && new Date(staff.ValidityDate) < new Date()) {
        return res.json({
          success: false,
          code: "EXPIRED",
          message: "Your account has expired",
        });
      }

      // Successful login
      return res.json({
        success: true,
        fLoginID: staff.fLoginID,
        StaffID: staff.StaffID,
      });
    } else {
      // Invalid credentials
      return res.json({
        success: false,
        code: "NOT_FOUND",
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.error("Error executing procedure:", error);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Database error",
    });
  }
});


//getShift
app.get("/GetShift", async (req, res) => {
  const { LoginID } = req.query; // we get it from query params for GET

  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    // Assuming your stored procedure is named `GetShift`
    const [rows] = await pool.query("CALL getShift(?)", [LoginID]);

    res.json({
      message: "Shift fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching Shift:", error);
    res.status(500).json({ error: "Failed to fetch Shift" });
  }
});

//InsertShift
app.post("/InsertShift", async (req, res) => {
  const { ShiftName, LoginID } = req.body;

  if (!ShiftName || !LoginID) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [rows] = await pool.query("CALL InsertShift(?, ?)", [
      ShiftName,
      LoginID,
    ]);
    res.json({ message: "Shift stored successfully", data: rows });
  } catch (error) {
    console.error("Error storing Shift:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: `Shift name "${ShiftName}" already exists` });
    }

    res.status(500).json({ error: "Failed to store shift" });
  }
});

//updateshift
app.put("/updateShift", async (req, res) => {
  const { SID, ShiftName, LoginID } = req.body;

  if (!SID || !ShiftName || !LoginID) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const sql = "CALL UpdateShift(?, ?, ?)";
    await pool.query(sql, [SID, ShiftName, LoginID]);

    res.json({ message: "Shift updated successfully" });
  } catch (err) {
    console.error("Error updating shift:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: `Shift name "${ShiftName}" already exists` });
    }

    res.status(500).json({ message: "Failed to update shift" });
  }
});

//deleteShift
app.delete("/deleteShift", async (req, res) => {
  const { SID, LoginID } = req.query;
  console.log("deleteShift =>", SID, LoginID);

  if (!SID || !LoginID) {
    return res.status(400).json({ message: "SID and LoginID are required" });
  }

  try {
    // Check if results reference this shift
    const [results] = await pool.query(
      "SELECT COUNT(*) AS count FROM result WHERE fShiftID = ?",
      [SID]
    );

    if (results[0].count > 0) {
      return res
        .status(409)
        .json({ message: "Unable to delete.Data Already exists!" });
    }

    // Proceed with deletion
    await pool.query("CALL DeleteShift(?, ?)", [SID, LoginID]);

    res.json({ message: "Shift deleted successfully" });
  } catch (err) {
    console.error("Error deleting shift:", err);

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Unable to delete.Data Already exists!",
      });
    }

    res.status(500).json({ message: "Failed to delete shift" });
  }
});


//getAllshiftName
app.get("/getAllShiftName", async (req, res) => {
  const { LoginID } = req.query; // we get it from query params for GET

  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    // Assuming your stored procedure is named `GetShift`
    const [rows] = await pool.query("CALL getAllShiftName(?)", [LoginID]);

    res.json({
      message: "Shift fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching Shift:", error);
    res.status(500).json({ error: "Failed to fetch Shift" });
  }
});
//getallClients
app.get("/getAllClientName", async (req, res) => {
  const { LoginID } = req.query; // we get it from query params for GET

  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    // Assuming your stored procedure is named `GetShift`
    const [rows] = await pool.query("CALL getAllClients(?)", [LoginID]);

    res.json({
      message: "client fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// InsertClient API
app.post("/InsertClient", async (req, res) => {
  const {
    ClientName,
    Pair_Rate,
    Pair_Comm,
    Haruf_Rate,
    Haruf_Comm,
    Patti,
    LC,
    UTTAR,
    LoginID,
  } = req.body;

  console.log(
    "checking",
    ClientName,
    Pair_Rate,
    Pair_Comm,
    Haruf_Rate,
    Haruf_Comm,
    Patti,
    LC,
    UTTAR,
    LoginID
  );

  // Helper function to check null/undefined but allow 0
  const isEmpty = (v) => v === null || v === undefined;

  if (
    !ClientName || // Still required string
    [Pair_Rate, Pair_Comm, Haruf_Rate, Haruf_Comm, Patti, LC].some(isEmpty) ||
    !LoginID
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [rows] = await pool.query(
      "CALL InsertClient(?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        ClientName,
        Pair_Rate,
        Pair_Comm,
        Haruf_Rate,
        Haruf_Comm,
        Patti,
        LC,
        UTTAR,
        LoginID,
      ]
    );

    res.json({ message: "Client stored successfully", data: rows });
  } catch (error) {
    console.error("Error storing client:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Client name already exists" });
    }

    res.status(500).json({ error: "Failed to store client" });
  }
});

//getClient
app.get("/getClient", async (req, res) => {
  const { LoginID } = req.query;

  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getClient(?)", [LoginID]);
    res.json({ message: "Clients fetched successfully", data: rows[0] });
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

//updateClient
// server.js (or routes file)
app.put("/updateClient", async (req, res) => {
  const {
    CID,
    ClientName,
    Pair_Rate,
    Pair_Comm,
    Haruf_Rate,
    Haruf_Comm,
    Patti,
    LC,
    UTTAR,
    LoginID,
  } = req.body;

  if (!CID || !LoginID) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const sql = "CALL UpdateClient(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const [rows] = await pool.query(sql, [
      CID,
      ClientName,
      Pair_Rate,
      Pair_Comm,
      Haruf_Rate,
      Haruf_Comm,
      Patti,
      LC,
      UTTAR,
      LoginID,
    ]);

    // MySQL CALL returns an array of arrays — adjust according to your SP output
    if (rows.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Client not found or no changes made" });
    }

    res.json({ message: "Client updated successfully" });
  } catch (err) {
    console.error("Error updating client:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: `Client name "${ClientName}" already exists` });
    }

    res.status(500).json({ message: "Failed to update client" });
  }
});

// DELETE Client
app.delete("/deleteClient", async (req, res) => {
  const { CID, LoginID } = req.body;

  if (!CID || !LoginID) {
    return res.status(400).json({ message: "Please Try Again" });
  }

  try {
    const sql = "CALL DeleteClient(?, ?)";
    await pool.query(sql, [CID, LoginID]);

    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);

      if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Unable to delete.Data Already exists!",
      });
    }
    res.status(500).json({ message: "Failed to delete client" });
  }
});

//insertResult
app.post("/insertResult", async (req, res) => {
  const { Date, fShiftID, Result, LoginID } = req.body;
  console.log(Date, fShiftID, Result, LoginID, "data");
  if (!Date || !fShiftID || !Result || !LoginID) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [rows] = await pool.query("CALL InsertResult(?, ?, ?, ?)", [
      Date,
      fShiftID,
      Result,
      LoginID,
    ]);

    res.json({
      message: "✅ Result inserted successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error inserting result:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: `❌ Result for ShiftName already exists`,
      });
    }

    res
      .status(500)
      .json({ error: "❌ Failed to insert result. Please try again later." });
  }
});

app.put("/UpdateWinning", async (req, res) => {
  const { Date, fShiftID, Results, LoginID } = req.body;

  if (!Date || !fShiftID || !Results || !LoginID) {
    return res.status(400).json({ message: "Date, Results, are required" });
  }

  try {
    const sql = "CALL UpdateWinning(?, ?, ?, ?)";
    await pool.query(sql, [Date, LoginID, fShiftID, Results]);

    res.json({ message: "Result updated successfully" });
  } catch (err) {
    console.error("Error updating result:", err);
    // if (err.code === "ER_DUP_ENTRY") {
    //   return res.status(409).json({
    //     error: `❌ Result for ShiftName already exists`
    //   });
    // }

    res.status(500).json({ message: "Failed to update result" });
  }
});
//getResult
// Get result by Date & LoginID
app.get("/getResult", async (req, res) => {
  const { Date, LoginID } = req.query;

  if (!Date || !LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getResult(?, ?)", [Date, LoginID]);

    res.json({
      message: "Result fetched successfully",
      data: rows[0], // MySQL CALL returns nested array
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

//updateResult
app.put("/updateResult", async (req, res) => {
  const { Date, fShiftID, Results, LoginID, RID } = req.body;

  if (!Date || !fShiftID || !Results || !LoginID || !RID) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    const sql = "CALL UpdateResult(?, ?, ?, ?, ?)";
    await pool.query(sql, [Date, fShiftID, Results, LoginID, RID]);

    res.json({ message: "Result updated successfully" });
  } catch (err) {
    console.error("Error updating result:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: `❌ Result for ShiftName already exists`,
      });
    }

    res.status(500).json({ message: "Failed to update result" });
  }
});
//deleteresult
app.delete("/deleteResult", async (req, res) => {
  const { RID, LoginID } = req.body;

  if (!RID || !LoginID) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const sql = "CALL DeleteResult(?, ?)";
    await pool.query(sql, [RID, LoginID]);
    res.json({ message: "Result deleted successfully" });
  } catch (error) {
    console.error("Error deleting result:", error);
    res.status(500).json({ message: "Failed to delete result" });
  }
});

//insertSale
app.post("/insertSale", async (req, res) => {
  const {
    fLoginID,
    SaleDate,
    fShiftID,
    fClientID,
    D_Rate,
    D_Comm,
    A_Rate,
    A_Comm,
    TotalAmount,
    Message,
    Patti,
    D_Sale,
    A_Sale,
    B_Sale,
    StaffID,
    // CurrentDateTime,
  } = req.body;

  const now = new Date();

  // IST timezone में convert
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const year = istNow.getFullYear();
  const month = String(istNow.getMonth() + 1).padStart(2, "0");
  const day = String(istNow.getDate()).padStart(2, "0");
  const hours = String(istNow.getHours()).padStart(2, "0");
  const minutes = String(istNow.getMinutes()).padStart(2, "0");
  const seconds = String(istNow.getSeconds()).padStart(2, "0");

  const CurrentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  try {
    const [result] = await pool.query(
      `CALL InsertSale(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?)`,
      [
        fLoginID,
        SaleDate,
        fShiftID,
        fClientID,
        D_Rate,
        D_Comm,
        A_Rate,
        A_Comm,
        TotalAmount,
        Message,
        Patti,
        D_Sale,
        A_Sale,
        B_Sale,
        StaffID,
        CurrentDateTime,
      ]
    );

    res.json({ success: true, message: "Sale inserted successfully" });
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: `❌ Sale already exists`,
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});
//getsale
app.get("/getSaleMessage", async (req, res) => {
  const { Date, LoginID, SID, fClientID, StaffID } = req.query;

  console.log(Date, LoginID, SID, fClientID, "fetxhsheet");

  if (!Date || !LoginID || !SID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    // agar fClientID empty, undefined ya "null"/"NULL" string hai to null pass karo
    const ClientID =
      fClientID && fClientID.toLowerCase() !== "null" ? fClientID : null;

    const [rows] = await pool.query("CALL getSaleMessage(?, ?, ?, ?,?)", [
      LoginID,
      SID,
      Date,
      ClientID,
      StaffID, // ✅ safe null
    ]);

    res.json({
      message: "Message fetched successfully",
      data: rows[0], // MySQL CALL returns nested array
    });
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

//deleteSales
app.delete("/deleteSale", async (req, res) => {
  const { LoginID, SaleID } = req.body;

  if (!LoginID || !SaleID) {
    return res.status(400).json({ message: "Please Try Again" });
  }

  try {
    const sql = "CALL DeleteSale(?, ?)";
    await pool.query(sql, [LoginID, SaleID]); // ✅ Order fixed
    res.json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting Sale:", error);
    res.status(500).json({ success: false, message: "Failed to delete Sale" });
  }
});

//getsaledetails
app.get("/getSaleDetails", async (req, res) => {
  const { Date, LoginID, SID, StaffID } = req.query;

  if (!Date || !LoginID || !SID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getSaleDetails(?, ?, ?,?)", [
      LoginID,
      SID,
      Date,
      StaffID || null,
    ]);

    res.json({
      message: "Sale details fetched successfully",
      data: rows[0], // MySQL CALL returns nested array
    });
  } catch (error) {
    console.error("Error fetching sale details:", error);
    res.status(500).json({ error: "Failed to fetch sale details" });
  }
});

// ✅ getlatestentry API
app.get("/getlatestEntry", async (req, res) => {
  const { LoginID } = req.query;

  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getLatestEntry(?)", [LoginID]);

    // MySQL से जो date आई है उसे force string बना दो
    const data = (rows[0] || []).map((r) => ({
      ...r,
      Date:
        r.Date instanceof Date
          ? r.Date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) // YYYY-MM-DD in IST
          : r.Date,
    }));

    res.json({
      message: "Entry fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching Entry:", error);
    res.status(500).json({ error: "Failed to fetch Entry" });
  }
});

//getSaleSummaryClintWise
app.get("/getSaleSummaryClientWise", async (req, res) => {
  const { Date, LoginID, fClientID, fShiftID } = req.query;

  if (!Date || !LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getSaleClientWise(?, ?, ?, ?)", [
      Date,
      LoginID,
      fClientID && fClientID !== "null" && fClientID !== "NULL"
        ? fClientID
        : null,
      fShiftID && fShiftID !== "null" && fShiftID !== "NULL" ? fShiftID : null,
    ]);

    res.json({
      message: "Sale summary fetched successfully",
      data: rows[0], // MySQL CALL returns nested array
    });
  } catch (error) {
    console.error("Error fetching sale summary:", error);
    res.status(500).json({ error: "Failed to fetch sale summary" });
  }
});

//getProfitLoss
app.get("/getProfitORLoss", async (req, res) => {
  const { LoginID, FromDate, ToDate } = req.query;

  if (!LoginID || !FromDate || !ToDate) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getProfitORLoss(?, ?, ?)", [
      LoginID,
      FromDate,
      ToDate,
    ]);

    res.json({
      message: "P&L fetched successfully",
      data: rows[0], // procedure का result
    });
  } catch (error) {
    console.error("Error fetching P&L:", error);
    res.status(500).json({ error: "Failed to fetch P&L" });
  }
});

//getResultFromDatefShiftID
app.get("/getResultFromDatefShiftID", async (req, res) => {
  const { Date, fShiftID, fLoginID } = req.query;

  if (!Date || !fLoginID || !fShiftID) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    const [rows] = await pool.query("CALL getResultFromDatefShiftID(?, ?, ?)", [
      Date,
      fShiftID,
      fLoginID,
    ]);

    // MySQL CALL returns nested array => rows[0]
    res.json({
      message: "Result fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching Result:", error);
    res.status(500).json({ error: "Failed to fetch Result" });
  }
});

// insertAccounts
app.post("/insertAccount", async (req, res) => {
  const { fLoginID, Date, fClientID, Liye, Diye, Narration } = req.body;

  // Basic input validation
  if (!fLoginID || !Date || !fClientID) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    const [result] = await pool.query(`CALL insertAccount(?, ?, ?, ?, ?, ?)`, [
      Date,
      fClientID,
      Liye,
      Diye,
      Narration,
      fLoginID,
    ]);

    // Optionally return the inserted ID
    const newAccountID = result[0]?.NewAccountID || null;

    res.json({
      success: true,
      message: "Account inserted successfully",
      AccountID: newAccountID,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});
//getAccutonts
app.get("/getAccount", async (req, res) => {
  const { fLoginID, Date } = req.query;

  if (!fLoginID || !Date) {
    return res.status(400).json({ error: "Please Try Again" });
  }

  try {
    // Call the stored procedure
    const [rows] = await pool.query("CALL getAccount(?, ?)", [fLoginID, Date]);

    // rows[0] में actual result आता है
    res.json({
      success: true,
      message: "Account fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//updateAccount
app.post("/updateAccount", async (req, res) => {
  const { AccountID, fLoginID, Date, fClientID, Liye, Diye, Narration } =
    req.body;

  // Basic input validation
  if (!AccountID || !fLoginID || !Date || !fClientID) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    const [result] = await pool.query(
      `CALL updateAccount(?, ?, ?, ?, ?, ?, ?)`,
      [AccountID, Date, fClientID, Liye, Diye, Narration, fLoginID]
    );

    // Agar procedure return kare updated record
    const updatedAccount = result[0] || null;

    res.json({
      success: true,
      message: "Account updated successfully",
      account: updatedAccount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//deleteAccount
// DELETE Account
app.delete("/deleteAccount", async (req, res) => {
  const { AccountID, fLoginID } = req.body;

  if (!AccountID || !fLoginID) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    await pool.query("CALL DeleteAccount(?, ?)", [AccountID, fLoginID]);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//getbalnacesheet
app.post("/getClientSumTotal", async (req, res) => {
  const { fLoginID, Date } = req.body;

  if (!fLoginID || !Date) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  try {
    const [rows] = await pool.query(`CALL getBalanceSheet(?, ?)`, [
      fLoginID,
      Date,
    ]);

    // MySQL procedure result आता है nested array में, इसको निकालना पड़ेगा
    const result = rows[0] || [];

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching client totals:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
//insertStaff
app.post("/insertstaff", async (req, res) => {
  try {
    const { StaffName, Mobile, Password, fLoginID } = req.body;

    if (!StaffName || !Mobile || !Password || !fLoginID) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [rows] = await pool.query("CALL InsertStaff(?, ?, ?, ?)", [
      StaffName,
      Mobile,
      Password,
      fLoginID,
    ]);

    res.json({
      success: true,
      message: "Staff inserted successfully",
      data: rows,
    });
  } catch (err) {
    console.error("InsertStaff Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//getStaff
app.get("/getStaff", async (req, res) => {
  try {
    const { fLoginID } = req.query;

    const [rows] = await pool.query("CALL getStaff(?)", [fLoginID]);

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

app.get("/getStaffCount", async (req, res) => {
  const { LoginID } = req.query; 
  if (!LoginID) {
    return res.status(400).json({ error: "Please Try Again" });
  }
  try {
    const [rows] = await pool.query("CALL getStaffCount(?)", [LoginID]);

    res.json({
      message: "StaffCount fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching StaffCount:", error);
    res.status(500).json({ error: "Failed to fetch StaffCount" });
  }
});




// Update Staff API
app.put("/updateStaff", async (req, res) => {
  try {
    const { StaffID, StaffName, Mobile, Password, fLoginID } = req.body;

    if (!StaffID) {
      return res.status(400).json({ error: "Please Try Again" });
    }

    // CALL stored procedure
    const [rows] = await pool.query("CALL UpdateStaff(?, ?, ?, ?, ?)", [
      StaffID,
      StaffName,
      Mobile,
      Password,
      fLoginID,
    ]);

    res.json({ message: "Staff updated successfully" });
  } catch (error) {
    console.error("Error updating staff:", error);
    res.status(500).json({ error: "Failed to update staff" });
  }
});
//deleteStaff
app.delete("/deleteStaff", async (req, res) => {
  try {
    const { StaffID, fLoginID } = req.body;

    if (!StaffID || !fLoginID) {
      return res.status(400).json({ error: "Please Try Again" });
    }

    const [result] = await pool.query("CALL DeleteStaff(?, ?)", [
      StaffID,
      fLoginID,
    ]);

    res.json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res.status(500).json({ error: "Failed to delete staff" });
  }
});

//getAllStaff
app.get("/getAllStaff", async (req, res) => {
  try {
    const { fLoginID } = req.query;

    const [rows] = await pool.query("CALL getAllStaff(?)", [fLoginID]);

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Check DB connection on server start
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connected to database successfully!");
    connection.release();
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
  }
})();

app.get("/okay", (req, res) => {
  res.send("Backend running successfully!");
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
