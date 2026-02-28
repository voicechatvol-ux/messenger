const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Подключение к базе данных
mongoose.connect('mongodb://localhost:27017/messenger')
  .then(() => console.log('✅ База данных подключена!'))
  .catch(err => console.log('❌ Ошибка базы:', err));

// Схема сообщения
const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  time: String,
  date: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Отдаём историю сообщений
app.get('/messages', async (req, res) => {
  const messages = await Message.find().sort({ date: -1 }).limit(50);
  res.json(messages.reverse());
});

io.on('connection', async (socket) => {
  console.log('Пользователь подключился!');

  // Отправляем историю новому пользователю
  const history = await Message.find().sort({ date: -1 }).limit(50);
  socket.emit('history', history.reverse());

  socket.on('message', async (data) => {
    const time = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const msgData = {
      name: data.name,
      text: data.text,
      time: time
    };

    // Сохраняем в базу
    const message = new Message(msgData);
    await message.save();

    // Отправляем всем
    io.emit('message', msgData);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});