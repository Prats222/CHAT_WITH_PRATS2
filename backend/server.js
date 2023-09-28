const express = require("express");
// const cors = require('cors');
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes')
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path= require("path");

dotenv.config();
const app= express();
connectDB();
// app.use(cors());

app.use(express.json());

// app.get('/',(req,res)=>{
//     res.send("Api running");
// });

app.use("/api/user",userRoutes);
app.use("/api/chat",chatRoutes);
app.use("/api/message", messageRoutes);

// deployment changes

const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname1, "/frontend/build")));
  
    app.get("*", (req, res) =>
      res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
    );
  } else {
    app.get("/", (req, res) => {
      res.send("API is running..");
    });
  }
//--------------------------------------------------------------
// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server= app.listen(PORT,console.log(`server on ${PORT}`.yellow.bold));

const io= require('socket.io')(server,{
    pingTimeout:60000,
    cors:{
        origin:"http://localhost:3000",
    }
});

io.on("connection", (socket)=>{
    console.log('connected to socket.io')
    socket.on('setup',(userData)=>{
        socket.join(userData._id)
        socket.emit("connected")
    })

    socket.on('join chat', (room) =>{
        socket.join(room)
     console.log("User Joined room:" + room)
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on('new message',(newMessageReceived) =>{
        var chat = newMessageReceived.chat;
        if(!chat.users) return console.log('chat.users not defined');

        chat.users.forEach(user => {
         if(user._id == newMessageReceived.sender._id) return;    
         
         socket.in(user._id).emit("message recieved", newMessageReceived);
        });
    });
    socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
      });
});
