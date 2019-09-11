require('dotenv').config();
var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    cookieParser = require("cookie-parser"),
    LocalStrategy = require("passport-local"),
    flash        = require("connect-flash"),
    session = require("express-session"),
    MongoStore = require("connect-mongo")(session),
    seedDB      = require("./seeds"),
    geocoder = require('geocoder'),
    Campground  = require("./models/campground"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    Review      = require("./models/rating"),
    Picture     = require("./models/pictures"),
    Register    = require("./models/register"),
    CampgroundCart = require("./models/CampgroundCart"),
    Camps       = require("./models/camps"),
    Cart        = require("./models/cart"),
    middleware  = require("./middleware/index"),
   passportlocalmongoose = require("passport-local-mongoose"),
    methodOverride = require("method-override"),
    multer = require('multer'),
    cloudinary = require('cloudinary'),
     async = require("async"),
     nodemailer = require("nodemailer"),
    crypto         = require("crypto"),
    CampgroundQuantity = 0;
// configure dotenv
//require('dotenv').load();
 
//console.log(process.env.DATABASEURL);
//mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true });
mongoose.connect("mongodb+srv://rohithsingh:geethasingh@10@cluster0-tl3dm.mongodb.net/test?retryWrites=true&w=majority",{useNewUrlParser: true} );

 //mongoose.connect("mongodb://localhost:27017/yelp_camp11", { useNewUrlParser: true });
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride('_method'));
//app.use(cookieParser('secret'));
//require moment
app.locals.moment = require('moment');
// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  cookie: { maxAge:  14400 * 60 * 1000 }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());





app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.session = req.session;
   res.locals.quantity = CampgroundQuantity;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});
cloudinary.config({ 
  cloud_name: 'def8dtkmv', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get("/",function(req,res){
  res.render("landing");
});

//INDEX - show all campgrounds
app.get("/campgrounds",middleware.isLoggedIn, function(req, res){
  var perPage = 8;
  var pageQuery = parseInt(req.query.page);
  var pageNumber = pageQuery ? pageQuery : 1;
  if(req.query.search) {
    var noMatch = null;
      const  campground_name = new RegExp(escapeRegex(req.query.search), 'gi');
      Campground.find({$or:[{name:campground_name},{"author.username": campground_name},{location:campground_name}]}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
          Campground.count({$or:[{name:campground_name},{"author.username": campground_name},{location:campground_name}]}).exec(function (err, count) {
              if (err) {
                  console.log(err);
                  res.redirect("back");
              } else {
                  if(allCampgrounds.length < 1) {
                      noMatch = "No Campgrounds Match, please try again";
                     return res.render("campgrounds/index",{
                       campgrounds: allCampgrounds,
                       current: pageNumber,
                      pages: Math.ceil(count / perPage),
                       noMatch : noMatch,
                       search: req.query.search
                      });
                  }
                  res.render("campgrounds/index", {
                      campgrounds: allCampgrounds,
                      current: pageNumber,
                      pages: Math.ceil(count / perPage),
                      noMatch: noMatch,
                      search: req.query.search
                  });
              }
          });
      });
  } else {
      // get all campgrounds from DB
      Campground.find({createdby:'true'}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
          Campground.count().exec(function (err, count) {
              if (err) {
                req.flash("error","Campground not found!!!");
                res.redirect("back");
              } else {
                  res.render("campgrounds/index", {
                      campgrounds: allCampgrounds,
                      current: pageNumber,
                      pages: Math.ceil(count / perPage),
                      noMatch: noMatch,
                      search: false
                  });
              }
          });
      });
  }
  // if(req.query.search){
  //   var noMatch = null;
  //   const campground_name = new RegExp(escapeRegex(req.query.search), 'gi');
  //   Campground.find({$or:[{name:campground_name},{"author.username": campground_name},{location:campground_name}]}, function(err, allCampgrounds){
  //     if(err){
  //       req.flash("error");
  //       res.redirect("back");
  //     } else {
  //       if(allCampgrounds.length<1){
  //         noMatch = "No Campgrounds Match, please try again";
  //         res.render("campgrounds/index",{campgrounds: allCampgrounds,noMatch : noMatch});
  //       }else{
  //         res.render("campgrounds/index",{campgrounds: allCampgrounds,noMatch:noMatch});
  //       }
  //     }
  // });
  // }else{
  //     // Get all campgrounds from DB
  //     Campground.find({createdby:'true'}, function(err, allCampgrounds){
  //        if(err){
  //         req.flash("error");
  //         res.redirect("back");
  //        } else {
  //               res.render("campgrounds/index",{campgrounds: allCampgrounds,noMatch: noMatch});
  //        }
  //    });
  //   }
});

app.get("/campgrounds/new", function(req, res){
   res.render("campgrounds/new"); 
});
//CREATE - add new campground to DB
app.post("/campgrounds",upload.single('file-image'), function(req, res){
  //console.log(req.file.path);
    var name = req.body.name;
    var image = req.body.image;
    var fileimage = req.body.file-image;
    var desc = req.body.description;
    var author = {
      id: req.user._id,
      username: req.user.username
      }
      var cost = req.body.cost;
      var location = req.body.location;
    // add cloudinary url for the image to the campground object under image property
    var newCampground = {name: name, image: image,fileimage:fileimage, description: desc,location:location, cost: cost, author:author};
    //newCampground.fileimage = result.secure_url;
    Campground.create(newCampground, function(err, newlyCreated){
      if(err){
        req.flash("error");
        res.redirect("back");
      } else {
        req.flash("success","Soon be added to campgrounds list!!!!");
        console.log("=============result=====================");
        //console.log(result);
        console.log(newlyCreated);
        CampgroundQuantity++;
          res.redirect("/campgrounds");
      }
   });
 
  

});

app.get("/campgrounds/notifications",function(req,res){
     Campground.find({createdby:'false'},function(err,foundCampground){
           if(err){
            req.flash("error");
            res.redirect("back");
           }else{
             res.render("campgrounds/notifications",{campgrounds:foundCampground});
           }
     });
});

app.get("/campgrounds/:campgroundid/create/:userid",function(req,res){
  var campgroundid = req.params.campgroundid;
  var userid = req.params.userid;
       Campground.findById(campgroundid,function(err,foundCampground){
           if(err){
            req.flash("error");
            res.redirect("back");
           }else{
             var created = foundCampground.createdby = 'true';
             var newData = {createdby:created};
             Campground.findByIdAndUpdate(campgroundid,newData,function(err,updated){
                if(err){
                  req.flash("error");
                  res.redirect("back");
                }else{
                  req.flash("success","Successfully added the Campgrounds");
                  CampgroundQuantity--;
                  res.redirect("/campgrounds/notifications");
                }
             });
           }
       });
});

app.get("/campgrounds/:campgroundid/destroy/:userid",function(req,res){
  var campgroundid = req.params.campgroundid;
  var userid = req.params.userid;
       Campground.findByIdAndRemove(campgroundid,function(err,foundCampground){
           if(err){
            req.flash("error");
            res.redirect("back");
           }else{
            req.flash("error","Successfully deleted the Campground");
            CampgroundQuantity--;
            res.redirect("/campgrounds/notifications");
           }
       });
});
// SHOW - shows more info about one campground
app.get("/campgrounds/:id", function(req, res){
  var campgroundsId = req.params.id;
  // console.log( typeof req.params.id);
    Campground.findById(req.params.id).populate("comments pictures reviews").populate(
          {
            path: " comments reviews",
           options: {sort: {createdAt: -1}}
          }
           ).exec(function(err, foundCampground){
        if(err){
          req.flash("error");
          res.redirect("back");
        } else {
          var timer = 0;
          if (!req.session.campgroundcart) {
            res.render("campgrounds/show", {cartarray : null,timer:timer,campgroundcartarray:null, campground:foundCampground});
             } else {
            var campgroundcart = new CampgroundCart(req.session.campgroundcart);
            var campgroundcartarray = campgroundcart.generateArray();
            var campgroundids = campgroundcart.generatecampgroundids();
            for(var i=0;i<campgroundcartarray.length;i++){
              if(campgroundids[i]==campgroundsId){
               var size = campgroundcartarray[i].newregister.length;
                break;
              }
            }
            res.render("campgrounds/show", { campgroundids:campgroundids ,timer: timer,cartarray:size,campgroundcartarray:campgroundcartarray ,campground:foundCampground});
          }
        }
    });
});


app.get("/campgrounds/:id/edit", middleware.checkUserCampground ,function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
          req.flash("error");
          res.redirect("back");
        } else {
            //render show template with that campground
            res.render("campgrounds/edit", {campground: foundCampground});
        }
    });
});

app.put("/campgrounds/:id", function(req, res){
    //var lat = data.results[0].geometry.location.lat;
    //var lng = data.results[0].geometry.location.lng;
    //var location = data.results[0].formatted_address;
    var newData = {name: req.body.name, image: req.body.image, description: req.body.description,location:req.body.location, cost: req.body.cost};
    Campground.findByIdAndUpdate(req.params.id, newData, function(err, campground){
        if(err){
          req.flash("error");
          res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});

app.delete("/campgrounds/:id", middleware.checkUserCampground , function(req, res) {
  Campground.findByIdAndRemove(req.params.id, function(err, campground) {
    if(err){
      res.redirect("/campgrounds/"+req.params.id);
    }
    else{
      res.redirect("/campgrounds");
    }
  });
});

app.get("/campgrounds/:campgroundid/register/:userid/new",function(req,res){ 
  var campgroundsId = req.params.campgroundid;
   var registerId = req.params.userid;
    Campground.findById(req.params.campgroundid, function(err,foundCampground){
            if(err){
              req.flash("error","Something Went Wrong!!");
              res.redirect("/campgrounds/"+req.params.id);
            }else{
              User.findById(req.params.userid,function(err,foundUser){
                 if(err){
                  req.flash("error","Something Went Wrong!!");
                  res.redirect("/campgrounds/"+req.params.id);
                 }else{
                  if (!req.session.campgroundcart) {
                    res.render("register/new",{campground:foundCampground,user:foundUser});
                  }else{
                    var count = 0;
                    var campgroundcart = new CampgroundCart(req.session.campgroundcart);
                    var data = campgroundcart.generateArray();
                    for(var i=0;i<data.length;i++){
                      var break_state = 'false';
                      var size = data[i].newregister.length;
                      for(var j=0;j<size;j++){
                        if((data[i].newregister[j]==registerId)&&(data[i].campgroundid==campgroundsId)){
                          count++;
                          break_state = 'true';
                          break;
                        }
                      }
                      if(break_state==='true'){
                        break;
                      }
                    }
                    
                    if(count===1){
                        req.flash("error","you already registered!!!!");
                        return res.redirect("/campgrounds/"+req.params.campgroundid);
                    }else{
                      req.flash("success","you will be registered soon !!!");
                        return res.render("register/new",{campground:foundCampground,user:foundUser});
                    }
                  }
                 }
              });
            }
    });
});
app.put("/campgrounds/:campgroundid/register/:userid", function(req,res){
  var campgroundsId = req.params.campgroundid;
     var register1 = {
         username : req.body.username,
         firstName : req.body.firstName,
         lastName  : req.body.lastName,
         email : req.body.email,
         avatar: req.body.avatar
       };
     Campground.findById(campgroundsId,function(err,foundCampground){
           if(err){
            req.flash("error","Something Went Wrong!!");
            res.redirect("/campgrounds/"+req.params.id);
           }else{
             User.findByIdAndUpdate(req.params.userid,register1,function(err,foundUser){
                if(err){
                  req.flash("error","Something Went Wrong!!");
                  res.redirect("/campgrounds/"+req.params.id);
                }else{
                  var registerid = req.params.userid;
                  //var cart = new Cart(req.session.cart ? req.session.cart : {newuser: {}});
                  var campgroundcart = new CampgroundCart(req.session.campgroundcart ? req.session.campgroundcart : {}); 
                  campgroundcart.add(campgroundsId,registerid,foundUser);
                  campgroundcart.duplicateadd(campgroundsId,registerid,foundUser);
                  campgroundcart.idarray(campgroundsId);
                  req.session.campgroundcart = campgroundcart;
                  //var keys = Object.keys(req.session.campgroundcart.campground);
                  req.flash("success","you will be registered soon !!!");
                  res.redirect("/campgrounds/"+campgroundsId);
                }
             });
           }
     });
});

app.get("/campgrounds/registrations/:id",function(req,res){
  var campgroundsId = req.params.id;
  Campground.findById(campgroundsId,function(err,foundCampground){
       if(err){
        req.flash("error","Something Went Wrong!!");
        res.redirect("/campgrounds/"+req.params.id);
       }else{
        if (!req.session.campgroundcart) {
          res.render("campgrounds/registrations", { registrations: null , campground:foundCampground});
           } else {
             var count = 0;
             var size;
             var k;
          var campgroundcart = new CampgroundCart(req.session.campgroundcart);
          var ids = campgroundcart.generatecampgroundids();
          var data = campgroundcart.generateArray();
          for(var i=0;i<data.length;i++){
            if(ids[i]==campgroundsId){
              count++;
               size = data[i].newregister.length;
               k = i;
              break;
            }
          }
          if(count===1){
            var obj = ids[k]; 
           return  res.render("campgrounds/registrations", {  registrations: data , campgroundsId:obj,size:size, campground:foundCampground});  
          }else{
            return res.redirect("/campgrounds/"+campgroundsId);
          }
        }
       }
  });
});
app.get("/campgrounds/:campgroundsId/acceptregistrations/:registerId",function(req,res){
       var campgroundsId = req.params.campgroundsId;
       var registerId = req.params.registerId;
       Campground.findById(campgroundsId,function(err,foundCampground){
           if(err){
            req.flash("error","Something Went Wrong!!");
            res.redirect("/campgrounds/registrations/"+campgroundsId);
           }else{
             var count = 0;
            var campgroundcart = new CampgroundCart(req.session.campgroundcart);
            var accept = campgroundcart.acceptandreject(campgroundsId,registerId);
            var data = campgroundcart.duplicategenerateArray();
            //var ids = campgroundcart.generatecampgroundids();
            for(var i=0;i<data.length;i++){
              var break_state='false';
             if(data[i].campgroundid==campgroundsId){
               var size = data[i].newregister.length;
               for(var j=0;j<size;j++){
                 var registerdata = data[i].newregister[j];
                 if(registerdata==registerId){
                   var register2 = data[i].register1[j];
                   break_state = 'true';
                   break;
                 }
               }
             }
              if(break_state==='true')
                break;
            }

            var username = register2.username;
            var  avatar =  register2.avatar;
            var firstName = register2.firstName;
            var lastName = register2.lastName;
            var email = register2.email;
            var register = {
              username : username,
              avatar : avatar,
              firstName : firstName,
              lastName : lastName,
              email : email
           };
            Register.create(register,function(err,registered){
               if(err){
                req.flash("success","registered!!!!");
                res.redirect("/campgrounds/registrations/"+campgroundsId);
               }else{
                foundCampground.register.push(registered);
                foundCampground.save(function(err,saved){
                    if(err){
                      req.flash("error","not registered!!!! 222");
                      res.redirect("/campgrounds/registrations/"+campgroundsId);
                    }else{
                      console.log(saved);
                      req.flash("success"," registered!!!!");
                      res.redirect("/campgrounds/registrations/"+campgroundsId);
                    }
                });
               }
            });
           }
       });
});
app.get("/campgrounds/:campgroundsId/rejectregistrations/:registerId",function(req,res){
  var campgroundsId = req.params.campgroundsId;
  var registerId = req.params.registerId;
  Campground.findById(campgroundsId,function(err,foundCampground){
    if(err){
     req.flash("error","Something Went Wrong!!");
     res.redirect("/campgrounds/registrations/"+campgroundsId);
    }else{
      var campgroundcart = new CampgroundCart(req.session.campgroundcart);
       campgroundcart.acceptandreject(campgroundsId,registerId);
      req.flash("error","sorry your are rejected!!!");
     res.redirect("/campgrounds/registrations/"+campgroundsId);
    }
  });
});

app.get("/campgrounds/:id/reviews",function(req,res){
      var campgroundid = req.params.id;
      Campground.findById(req.params.id).populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
    }).exec(function (err, campground) {
        if (err || !campground) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", {campground: campground});
    });
});
app.get("/campgrounds/:id/reviews/new",function(req,res){
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
        req.flash("error", err.message);
        return res.redirect("back");
    }
    res.render("reviews/new", {campground: campground});

});
});

app.post("/campgrounds/:id/reviews",function(req,res){
       var campgroundid = req.params.id;
       Campground.findById(req.params.id).populate("reviews").exec(function (err, campground) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Review.create(req.body.review, function (err, review) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            //add author username/id and associated campground to the review
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.campground = campground;
            //save review
            review.save();
            campground.reviews.push(review);
            // calculate the new average review for the campground
            campground.rating = calculateAverage(campground.reviews);
            //save campground
            campground.save();
            req.flash("success", "Your review has been successfully added.");
            res.redirect('/campgrounds/' + campgroundid);
        });
    });
});
app.get("/campgrounds/:campgroundid/reviews/:reviewid/edit",function(req,res){
      var campgroundid = req.params.campgroundid;
      var reviewid = req.params.reviewid;
      Campground.findById(campgroundid,function(err,foundCampground){
         if(err){
          req.flash("error","Campground not found!!");
          res.redirect("/campgrounds/"+campgroundid);
         }else{
           Review.findById(reviewid,function(err,foundreview){
              if(err){
                req.flash("error","Campground review not found!!");
                 res.redirect("/campgrounds/"+campgroundid);
              }else{
                res.render("reviews/edit", {campground_id: campgroundid, review: foundreview});
              }
           });
         }
      });
});
app.put("/campgrounds/:campgroundid/reviews/:reviewid",function(req,res){
       var campgroundid = req.params.campgroundid;
       var reviewid = req.params.reviewid;
       Review.findByIdAndUpdate(reviewid, req.body.review, {new: true}, function (err, updatedReview) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Campground.findById(campgroundid).populate("reviews").exec(function (err, campground) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate campground average
            campground.rating = calculateAverage(campground.reviews);
            //save changes
            campground.save();
            req.flash("success", "Your review was successfully edited.");
            res.redirect('/campgrounds/' + campgroundid);
        });
    });
});
app.delete("/campgrounds/:campgroundid/reviews/:reviewid",function(req,res){
  var campgroundid = req.params.campgroundid;
  var reviewid = req.params.reviewid;
  Review.findByIdAndRemove(reviewid, function (err) {
    if (err) {
        req.flash("error", err.message);
        return res.redirect("back");
    }
    Campground.findByIdAndUpdate(campgroundid, {$pull: {reviews: reviewid}}, {new: true}).populate("reviews").exec(function (err, campground) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        // recalculate campground average
        campground.rating = calculateAverage(campground.reviews);
        //save changes
        campground.save();
        req.flash("success", "Your review was deleted successfully.");
        res.redirect("/campgrounds/" +campgroundid);
    });
});
});
app.post("/campgrounds/:id/comments", function(req, res)
{
   var id1 = req.params.id;
   var text = req.body.text;
   var author = {
        id : req.user._id,
        username : req.user.username
   }
   var comments = {text : text,author : author};
   Campground.findById(id1,function(err,campground)
   {
      if(err)
      {
         req.flash("error","Campground not found!!");
                  res.redirect("/campgrounds/"+id1);
      }
      else
      {
          Comment.create(comments,function(err,commentcreated)
          {
              if(err)
              {
                  req.flash("error","Something Went Wrong11!!");
                  res.redirect("/campgrounds/"+id1);
              }
              else
              {   console.log(commentcreated);
                 campground.comments.push(commentcreated);
                 console.log("=========================================");
                  campground.save(function(err,commentsaved){
                              console.log(commentsaved);
                              if(err)
                               {
                                  req.flash("error","Something Went Wrong12!!");
                                      res.redirect("/campgrounds/"+id1);
                                }
                                else
                                {
                                   res.redirect("/campgrounds/"+ id1);
                                 }
                  });                       
               }
          });
      }
    });
});




//Comments Create

app.get("/campgrounds/:id/comments/:commentId/edit", middleware.checkUserComment, function(req,res){
          var commentid = req.params.commentId;
          var id1 = req.params.id;
          Campground.findById(id1,function(err,campgroundfound){
                   if(err){
                    req.flash("error","Campground not found!!");
                  res.redirect("/campgrounds");
                   }
                   else{
                          Comment.findById(commentid,function(err,commentfound){
                                if(err){
                                        req.flash("error","Something Went Wrong!!");
                                        console.log("err at 1st ");
                                              res.redirect("/campgrounds/"+id1);
                                         }
                                     else{
                                          res.render("comments/edit",{comment:commentfound,campground:campgroundfound});
                                       }
                                     });
                        }
          });
         

});

app.put("/campgrounds/:id/comments/:commentid",function(req,res){
  var id1 = req.params.id;
      var text = req.body.text;
       var newComment = {text:text};
       Comment.findByIdAndUpdate(req.params.commentid,newComment,function(err,commentupdated){
                      if(err){
                         res.redirect("/campgrounds/"+id1);
                      }
                      else{

                         res.redirect("/campgrounds/"+id1);
                      }
                         });                     
});


app.delete("/campgrounds/:id/comments/:commentId",middleware.checkUserComment, function(req,res){
  var id1 = req.params.id;
         Comment.findById(req.params.commentId,function(err,commentfound){
                if(err){
                 req.flash("error","Comment not found!!");
                  res.redirect("/campgrounds/"+id1);
                }
                else{
                    Comment.findByIdAndRemove(req.params.commentId,function(err,commentupdated){
                      if(err){
                         res.redirect("/campgrounds/"+id1);
                      }
                      else{
                        req.flash("error","You Deleted The Comment!!");
                         res.redirect("/campgrounds/"+id1);
                      }
                         });                     
                }
       });   
});

app.post("/campgrounds/:id/addpictures/:userid",function(req,res){
      var campgroundid = req.params.id;
      var userid = req.params.userid;
      var images = req.body.images;
      var author = {
           id : req.user._id,
           username : req.user.username
      }
      var pictures = {
                      images : images,
                      author : author
                    };
      Campground.findById(campgroundid,function(err,foundCampground){
         if(err){
          req.flash("error","Campground not found!!");
          res.redirect("/campgrounds/"+campgroundid);
         }else{
           User.findById(userid,function(err,foundUser){
              if(err){
                req.flash("error","User not found!!");
                res.redirect("/campgrounds/"+campgroundid);
              }else{
                Picture.create(pictures,function(err,insertpictures){
                   if(err){
                    req.flash("error","Pictures not found!!");
                    res.redirect("/campgrounds/"+campgroundid);
                   }else{
                     console.log("=============insertpictures=============");
                     console.log(insertpictures);
                     foundCampground.pictures.push(insertpictures);
                     foundCampground.save(function(err,picturesaved){
                       console.log("==============picturessaved=============");
                       console.log(picturesaved);
                        if(err){
                          req.flash("error","Pictures not saved!!");
                          res.redirect("/campgrounds/"+campgroundid);
                        }else{
                          res.redirect("/campgrounds/"+campgroundid);
                        }
                     });
                   }
                });
              }
           });
         }
      });
});

app.get("/campgrounds/:id/addtimer",function(req,res){
   var campgroundid = req.params.id;
   Campground.findById(campgroundid,function(err,foundCampground){
       if(err){
        req.flash("error","Campground not found!!");
        res.redirect("/campgrounds/"+campgroundid);
       }else{
         res.render("campgrounds/addtimer",{campground : foundCampground});
       }
   });
});
app.post("/campgrounds/:id/addtimer",function(req,res){
    var campgroundid = req.params.id;
    var d = new Date();
    var month = d.getMonth();
    var month_name = ["January","February","March","April","May","June","July","August","September","October","November","December"];
          var month_timer1 = req.body.month;
          var date = req.body.date;
          var month1 = month_name.indexOf(month_timer1);
          var year = 2019;
          var first_date = month_name[month1] + " " + date + " " + year;
          var tmp = new Date(first_date).toDateString();
          var sub = tmp.substring(4);
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
      if(err){
        console.log(err);
      } else {
        if (!req.session.campgroundcart) {
          res.render("campgrounds/show", {cartarray : null,campgroundcartarray:null,timer:sub, campground:foundCampground});
           } else {
          var campgroundcart = new CampgroundCart(req.session.campgroundcart);
          var campgroundcartarray = campgroundcart.generateArray();
          var campgroundids = campgroundcart.generatecampgroundids();
          for(var i=0;i<campgroundcartarray.length;i++){
            if(campgroundids[i]==campgroundid){
               size = campgroundcartarray[i].newregister.length;
              break;
            }
          }
          res.render("campgrounds/show", { campgroundids:campgroundids ,cartarray:size,timer:sub,campgroundcartarray:campgroundcartarray ,campground:foundCampground});
        }
      }
  });
}); 
app.get("/register", function(req, res){
   res.render("register"); 
});

// handle sign up logic
app.post("/register", function(req, res, next){
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
      });

    if(req.body.adminCode === 'rohithsingh246') {
      newUser.isAdmin = true;
    }

    User.register(newUser, req.body.password, function(err, user){
        if(err){
          req.flash("error","Account is already registered!!!!");
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Successfully Signed Up! Nice to meet you " + req.body.username);
        });
        async.waterfall([
          function(done) {
            crypto.randomBytes(20, function(err, buf) {
              var token = buf.toString('hex');
              done(err, token);
            });
          },
          function(token, done) {
            User.findOne({ email: req.body.email }, function(err, user) {
              if (!user) {
                req.flash('error', 'No account with that email address exists.');
                return res.redirect('/register');
              }
              user.registrationToken = token;
              user.registrationTokenExpires = Date.now() + 3600000; // 1 hour
              user.save(function(err) {
                done(err, token, user);
              });
            });
          },
          function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
              service: 'Gmail', 
              auth: {
                user: 'rohithsinghthakur3@gmail.com',
                pass: process.env.GMAILPW
              }
            });
            var mailOptions = {
              to: user.email,
              from: 'rohithsinghthakur3@gmail.com',
              subject: 'Node.js Account verification',
              text: 'You are receiving this because you (or someone else) have requested for the verification of your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/campgrounds/register/' + token + '\n\n' +
                'If you did not request this, please ignore this email .\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
              console.log('mail sent');
              req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
            
              done(err, 'done');
            });
          }
        ], function(err) {
          if (err) return next(err);
          res.redirect('/register');
        });
    });
        
});

app.get('/campgrounds/register/:token', function(req, res) {
  User.findOne({ registrationToken: req.params.token,  registrationTokenExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Registration token is invalid or has expired.');
      return res.redirect('/register');
    }
    res.render('verification');
  });
});
//show login form
app.get("/login", function(req, res){
   res.render("login"); 
});

// handling login logic
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login",
        failureFlash: true,
        successFlash: 'Welcome to YelpCamp!'
    }), function(req, res){
});

// logout route
app.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "See you later!");
   res.redirect("/campgrounds");
});

// forgot password
app.get('/forgot', function(req, res) {
  res.render('forgot');
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'rohithsinghthakur3@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'rohithsinghthakur3@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});
app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        console.log("user == "+ user.setPassword);
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'rohithsinghthakur3@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'learntocodeinfo@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

// USER PROFILE
app.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err) {
      req.flash("error", "Something went wrong.");
      res.redirect("/");
    }
    Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds});
    })
  });
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function calculateAverage(reviews) {
  if (reviews.length === 0) {
      return 0;
  }
  var sum = 0;
  reviews.forEach(function (element) {
      sum += element.rating;
  });
  return sum / reviews.length;
}

const port = process.env.PORT || 80;
app.listen(port,process.env.IP, function(){
   console.log("The Tourist Server Has Started!");
});