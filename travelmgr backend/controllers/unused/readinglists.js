const readinglistsRouter = require("express").Router();
const { Blog, User, Readinglist} = require("../models/DBmodels");
const { Op } = require('sequelize')
const { sequelize } = require("../utils/db");

// refactor with try/catch + async/await
readinglistsRouter.get("/", async (request, response, next) => {
  try {
    
    const readinglists = await Readinglist.findAll(  {  
      include: [ 
        { model: User }, 
        { model: Blog }
      ]
    }
    );
    response.json(readinglists);
  } catch (exception) {
    next(exception);
  }
});

readinglistsRouter.get("/:id", async (request, response, next) => {
  try {
   
    const readinglist = await Readinglist.findByPk(request.params.id,  {  
      include: [ 
        { model: User }, 
        { model: Blog }
      ]
    });
  
    if (readinglist) {
      response.json(readinglist);
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    next(exception);
  }
});

// post a new entry in the reading list
readinglistsRouter.post("/", async (request, response, next) => {
  try {
    const body = request.body;
    // check if body is complete
    const keys = Object.keys(body);
    let userId = body.userId;
    let blogId = body.blogId;
    let isRead = body.isRead;

    if (!request.user) {
      return response.status(401).json({ error: "token invalid" });
    }

    if (keys.indexOf("userId") < 0) {
      // no userId
      return response.status(400).json({
        error: "userId missing",
      });
    }

    if (keys.indexOf("blogId") < 0) {
      // no blogId
      return response.status(400).json({
        error: "blogId missing",
      });
    }


    const readinglist = new Readinglist({
      userId: userId,
      blogId: blogId,
      isRead: isRead
    });
    
    try {
          const savedReadinglist = await readinglist.save();
           
            response.status(201).json(savedReadinglist);
        }
        catch(error) {
          console.log("error", error)
          return response.status(400).json({
              error: "Creation of the reading list entry failed: "+error,
            });
          }
    
   
  } catch (exception) {
    next(exception);
  }
});

// update the readinglist state only the no modification allowed for blog id and user id => this must be in fact a delete + create 
readinglistsRouter.put("/:id", async (request, response, next) => {
  let readinglist = null;

  try {
   
   
    if (!request.user) {
      // this request requires a logged user => restrict access to its own reading entries
     
        return response.status(401).json({ error: "token invalid" });
    }
    
    // check if body is complete
    const body = request.body;
    const keys = Object.keys(body);
    if (keys.indexOf("read") < 0) {
      // no read
      return response.status(400).json({
        error: "read missing",
      });
    }

    readinglist = await Readinglist.findByPk(request.params.id);
    
    if (readinglist) {
      // update the properties given in the request
      
      readinglist.isRead = body.read;
      
      
      console.log("readinglist.userId", readinglist.userId.toString());
      console.log("request.user", request.user.toString());
      if (
        readinglist.userId.toString() === request.user.toString() 
      ) {
        
          console.log("readinglist", readinglist)
          try {
          await readinglist.save()
           response.json(readinglist);
        }
        catch(error) {
          console.log("error", error)
          return response.status(400).json({
              error: "Update of the readinglist failed: "+error,
            });
          }
       
      } else {
        response
          .status(403)
          .json({ error: "Update not authorized - only possible for reading list owner" });
      }
    } else {
      response.status(404).json({ error: "Reading list entry not found" });
    }
  } catch (exception) {
    next(exception);
  }
});

readinglistsRouter.delete("/:id", async (request, response, next) => {
  try {
    if (!request.user) {
      return response.status(401).json({ error: "token invalid" });
    }
    const blog = await Blog.findByPk(request.params.id);
    console.log("blog.findByPk", blog);
    if (blog) {
      if (blog.userId.toString() === request.user.toString()) {
        await blog.destroy();
        response.status(204).end();
      } else {
        response
          .status(403)
          .json({ error: "Delete not authorized - only possible for creator" });
      }
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    console.log("exception", exception);
    next(exception);
  }
});

module.exports = readinglistsRouter;
