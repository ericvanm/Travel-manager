const authorsRouter = require("express").Router();
const { Blog} = require("../models/DBmodels");
const { sequelize } = require("../utils/db");

// refactor with try/catch + async/await
authorsRouter.get("/", async (request, response, next) => {
  try {
    
    const blogs = await Blog.findAll(  {  
      group: 'author',
      attributes: [
        'author',
        [sequelize.fn('COUNT', sequelize.col('author')), 'articles'],
        [sequelize.fn('SUM', sequelize.col('likes')), 'likes']
      ],
      order: [[sequelize.literal('likes'), 'DESC']],
    
    }
    );
    response.json(blogs);
  } catch (exception) {
    next(exception);
  }
});

module.exports = authorsRouter;
