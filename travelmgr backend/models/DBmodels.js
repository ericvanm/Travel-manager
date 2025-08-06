const { Model, DataTypes } = require('sequelize')
const { sequelize } = require('../utils/db') 


// User model

class User extends Model {}
User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    validate: { isEmail: { msg: 'Validation isEmail on username failed'} },
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING,
  },
  disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
  },
  
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'user'
})

// the global data structure is the following
//
// Trip 1-n stages
// Stage 1-n activities
//
// Blog model


// Trip model

class Trip extends Model {} 
  Trip.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    startDate: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    endDate: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
  }, {
    sequelize,
    underscored: true,
    timestamps: true,
    modelName: 'trip'
  })


  // Stage model

  class Stage extends Model {} 
  Stage.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      blogId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'blogs', key: 'id' },
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      }
  }, {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'stage'
  })

// TripList
class TripList extends Model {} 
  TripList.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      tripId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'trips', key: 'id' },
      },
      
  }, {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'triplist'
  })


// relationships
User.hasMany(Blog)
Blog.belongsTo(User)

Stage.belongsTo(Trip, { foreignKey: 'tripId' })
Readinglist.belongsTo(Blog, { foreignKey: 'blogId' })
Trip.belongsToMany(User, { through: Trip, foreignKey: 'tripId' })
User.belongsToMany(Trip, { through: Readinglist, foreignKey: 'userId' })
User.hasMany(Readinglist, { foreignKey: 'userId' });

module.exports = {
  Blog, User, Readinglist
}