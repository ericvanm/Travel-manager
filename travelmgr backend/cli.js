const { Sequelize, QueryTypes } = require('sequelize')
const logger = require('./utils/logger')
const config = require('./utils/config')


const url = config.DB_URI
const sslToUse = config.ENVIR === 'production'


logger.info('connecting to', url)

const sequelize = new Sequelize(url, {
  dialectOptions: sslToUse ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
});



const main = async () => {
try {
    await sequelize.authenticate()
    const blogs = await sequelize.query("SELECT * FROM blogs", { type: QueryTypes.SELECT })
    blogs.forEach(blog => {
        console.log(`${blog.author}: '${blog.title}', ${blog.likes} likes`)
    })
   
    sequelize.close()  
} catch (error) {
    console.error('Unable to connect to the database:', error)    
}

}

main()