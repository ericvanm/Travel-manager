const blogsRouter = require("express").Router();
const { Blog, User} = require("../models/DBmodels");
const { Op } = require('sequelize')
const { sequelize } = require("../utils/db");

// refactor with try/catch + async/await
blogsRouter.get("/", async (request, response, next) => {
  try {
    const where = {}

    if (request.query.search) {
      where[Op.or] = [
        { title: { [Op.substring]: request.query.search } },
        { author: { [Op.substring]: request.query.search } }
      ]
    }

    const blogs = await Blog.findAll(  {  
      include: {      
        model: User    
      },
      order: [[sequelize.literal('likes'), 'DESC']],
      where
    }
    );
    response.json(blogs);
  } catch (exception) {
    next(exception);
  }
});

blogsRouter.get("/:id", async (request, response, next) => {
  try {
    //console.log("id",request.params.id )
    const blog = await Blog.findById(request.params.id).populate("user");
    //console.log("blog",blog )
    if (blog) {
      response.json(blog);
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    next(exception);
  }
});

// refactor with async/await
blogsRouter.post("/", async (request, response, next) => {
  try {
    const body = request.body;
    // check if body is complete
    const keys = Object.keys(body);
    let title = body.title;
    let author = body.author;
    let url = body.url;
    let likes = body.likes;
    let year = body.year

    if (!request.user) {
      return response.status(401).json({ error: "token invalid" });
    }

    if (keys.indexOf("title") < 0) {
      // no title
      return response.status(400).json({
        error: "title missing",
      });
    }

    if (keys.indexOf("year") < 0) {
      // no year
      return response.status(400).json({
        error: "year missing",
      });
    }

    if (keys.indexOf("author") < 0) {
      // no author
    }
    if (keys.indexOf("url") < 0) {
      // no url
      return response.status(400).json({
        error: "URL missing",
      });
    }
    if (keys.indexOf("likes") < 0) {
      // no like =< likes = 0
      likes = 0;
    }
    console.log("Request.user", request.user);
    //  get the logged user as creator of the new blog
    const creator = await User.findByPk(request.user);
    console.log("creator", creator);
    const blog = new Blog({
      title: title,
      author: author,
      url: url,
      likes: likes,
      year: year,
      userId: creator.id,
    });
    
    try {
          const savedBlog = await blog.save();
           
            response.status(201).json(savedBlog);
        }
        catch(error) {
          console.log("error", error)
          return response.status(400).json({
              error: "Creation of the blog failed: "+error,
            });
          }
    
   
  } catch (exception) {
    next(exception);
  }
});

blogsRouter.put("/:id", async (request, response, next) => {
  let blog = null;

  try {
    // update the 'put' action in order to check that the requestor is the creator
   
    if (!request.user) {
      // update to allow the update of the like value for exercise 5.8: Blog List Frontend, step 8 => accept update of number of like like
     const bodyRequest = request.body;
      if (bodyRequest.user) {
        request.user = bodyRequest.user.id;
      } else {
        return response.status(401).json({ error: "token invalid" });
      }
    }

    blog = await Blog.findByPk(request.params.id);
    
    if (blog) {
      // update the properties given in the request
      const body = request.body;
      // update is OK for likes even if not teh creator (for part7)
      let onlyLikesUpdated = true;
      if (body.title) {
        blog.title = body.title;
        onlyLikesUpdated = false;
      }
      if (body.author) {
        blog.author = body.author;
        onlyLikesUpdated = false;
      }
      if (body.url) {
        blog.url = body.url;
        onlyLikesUpdated = false;
      }
      if (body.likes) {
        blog.likes = body.likes;
      }
      console.log("blog.userId", blog.userId.toString());
      console.log("request.user", request.user.toString());
      if (
        blog.userId.toString() === request.user.toString() ||
        onlyLikesUpdated
      ) {
        
          console.log("blog", blog)
          try {
          await blog.save()
           response.json(blog);
        }
        catch(error) {
          console.log("error", error)
          return response.status(400).json({
              error: "Update of the blog failed: "+error,
            });
          }
       
      } else {
        response
          .status(403)
          .json({ error: "Update not authorized - only possible for creator" });
      }
    } else {
      response.status(404).end();
    }
  } catch (exception) {
    next(exception);
  }
});

blogsRouter.delete("/:id", async (request, response, next) => {
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

module.exports = blogsRouter;
