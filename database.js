var mongoose = require('mongoose');
var url= "mongodb://localhost:27017/cibo";
var ram = "mongodb+srv://raam:ramm1234@cluster0.gihj1.mongodb.net/cibo?retryWrites=true&w=majority";
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(ram, { useNewUrlParser: true, useUnifiedTopology: true },function(err, db) {
  if (err) throw err;
  console.log("Database created!");
});
