const { Model, DataTypes } = require('sequelize')
const { sequelize } = require('../utils/db') 

// Language model
class Language extends Model {}
Language.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(5),
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'language'
})

// Translation model
class Translation extends Model {}
Translation.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  languageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'languages', key: 'id' }
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fieldName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  translatedText: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'translation'
})

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
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user'
  },
  mustSetPassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'must_set_password'
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  readOnly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'read_only'
  },
  allowPasswordReset: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'allow_password_reset'
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: 'en'
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  defaultDepartureLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'default_departure_location'
  },
  passwordResetTokenHash: {
    type: DataTypes.STRING(128),
    allowNull: true,
    field: 'password_reset_token_hash'
  },
  passwordResetExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires_at'
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'user'
})

// Country model
class Country extends Model {}
Country.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(3),
    unique: true,
    allowNull: false
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'country'
})

// Trip model
class Trip extends Model {}
Trip.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  departureLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'departure_location'
  }
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
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'trips', key: 'id' }
  },
  countryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'countries', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'stage'
})

// ActivityType model
class ActivityType extends Model {}
ActivityType.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  label: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'activityType'
})

// Activity model
class Activity extends Model {}
Activity.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  activityTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'activity_types', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bookingCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startDateTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDateTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  roomType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Flight fields
  airline: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'airline'
  },
  flightNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'flight_number'
  },
  departureAirport: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'departure_airport'
  },
  arrivalAirport: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'arrival_airport'
  },
  seat: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'seat'
  },
  confirmationCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'confirmation_code'
  },
  gate: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'gate'
  },
  terminal: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'terminal'
  },
  // Car rental fields
  company: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'company'
  },
  pickupLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'pickup_location'
  },
  dropoffLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'dropoff_location'
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pickup_date'
  },
  dropoffDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'dropoff_date'
  },
  carType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'car_type'
  },
  // Continuous activity fields
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'group_id'
  },
  isGroupMaster: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_group_master'
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'check_out_time'
  },
  reservationStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'to_reserve',
    field: 'reservation_status'
  },
  bookingUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'booking_url'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  departureLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'departure_location'
  },
  arrivalLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'arrival_location'
  },
  transportLine: {
    type: DataTypes.STRING(120),
    allowNull: true,
    field: 'transport_line'
  },
  transportChanges: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'transport_changes'
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'activity'
})

// TransportType model
class TransportType extends Model {}
TransportType.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  label: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'transportType'
})

// Transport model
class Transport extends Model {}
Transport.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  transportTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'transport_types', key: 'id' }
  },
  departureLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  arrivalLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  departureDateTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  arrivalDateTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bookingReference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'transport'
})

// AccommodationType model
class AccommodationType extends Model {}
AccommodationType.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  label: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'accommodationType'
})

// Accommodation model
class Accommodation extends Model {}
Accommodation.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  accommodationTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'accommodation_types', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressLine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bookingReference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  costPerNight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'accommodation',
  tableName: 'accommodations'
})

// ExpenseCategory model
class ExpenseCategory extends Model {}
ExpenseCategory.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  label: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'expenseCategory'
})

// Expense model
class Expense extends Model {}
Expense.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'trips', key: 'id' }
  },
  expenseCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'expense_categories', key: 'id' }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  expenseDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'expense'
})

// NotificationType model
class NotificationType extends Model {}
NotificationType.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  label: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'notificationType'
})

// Notification model
class Notification extends Model {}
Notification.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  notificationTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'notification_types', key: 'id' }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'notification'
})

// TripList model
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
    references: { model: 'users', key: 'id' }
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'trips', key: 'id' }
  }
}, {
  sequelize,
  underscored: true,
  timestamps: false,
  modelName: 'tripList'
})

// Relationships
Language.hasMany(Translation, { foreignKey: 'languageId' })
Translation.belongsTo(Language, { foreignKey: 'languageId' })

Country.hasMany(Translation, { 
  foreignKey: 'entityId',
  scope: { entityType: 'country' },
  as: 'translations'
})

User.belongsTo(Language, { foreignKey: 'preferredLanguageId', as: 'preferredLanguage' })
Language.hasMany(User, { foreignKey: 'preferredLanguageId', as: 'users' })

Trip.hasMany(Stage, { foreignKey: 'tripId' })
Stage.belongsTo(Trip, { foreignKey: 'tripId' })

Country.hasMany(Stage, { foreignKey: 'countryId' })
Stage.belongsTo(Country, { foreignKey: 'countryId', as: 'Country' })

Stage.hasMany(Activity, { foreignKey: 'stageId' })
Activity.belongsTo(Stage, { foreignKey: 'stageId' })

ActivityType.hasMany(Activity, { foreignKey: 'activityTypeId' })
Activity.belongsTo(ActivityType, { foreignKey: 'activityTypeId' })

Stage.hasMany(Transport, { foreignKey: 'stageId' })
Transport.belongsTo(Stage, { foreignKey: 'stageId' })

TransportType.hasMany(Transport, { foreignKey: 'transportTypeId' })
Transport.belongsTo(TransportType, { foreignKey: 'transportTypeId' })

Stage.hasMany(Accommodation, { foreignKey: 'stageId' })
Accommodation.belongsTo(Stage, { foreignKey: 'stageId' })

AccommodationType.hasMany(Accommodation, { foreignKey: 'accommodationTypeId' })
Accommodation.belongsTo(AccommodationType, { foreignKey: 'accommodationTypeId' })

Trip.hasMany(Expense, { foreignKey: 'tripId' })
Expense.belongsTo(Trip, { foreignKey: 'tripId' })

ExpenseCategory.hasMany(Expense, { foreignKey: 'expenseCategoryId' })
Expense.belongsTo(ExpenseCategory, { foreignKey: 'expenseCategoryId' })

User.hasMany(Notification, { foreignKey: 'userId' })
Notification.belongsTo(User, { foreignKey: 'userId' })

NotificationType.hasMany(Notification, { foreignKey: 'notificationTypeId' })
Notification.belongsTo(NotificationType, { foreignKey: 'notificationTypeId' })

User.belongsToMany(Trip, { through: TripList, foreignKey: 'userId' })
Trip.belongsToMany(User, { through: TripList, foreignKey: 'tripId' })

// Flight model
class Flight extends Model {}
Flight.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  airline: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  flightNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  departureAirport: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  arrivalAirport: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  departureTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  arrivalTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  seat: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  confirmationCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  gate: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  terminal: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'flight'
})

// Lodging model
class Lodging extends Model {}
Lodging.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  roomType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'lodging',
  tableName: 'lodging'
})

// CarRental model
class CarRental extends Model {}
CarRental.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'stages', key: 'id' }
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pickupLocation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  dropoffLocation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dropoffDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  carType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  confirmationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'carRental'
})

// TripPlanningSession model
class TripPlanningSession extends Model {}
TripPlanningSession.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft'
  },
  formData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  synthesis: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  itinerary: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  revisionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  revisionFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'trips', key: 'id' }
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'tripPlanningSession'
})

User.hasMany(TripPlanningSession, { foreignKey: 'userId' })
TripPlanningSession.belongsTo(User, { foreignKey: 'userId' })
TripPlanningSession.belongsTo(Trip, { foreignKey: 'tripId' })

// TripAdaptationSession model
class TripAdaptationSession extends Model {}
TripAdaptationSession.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'trips', key: 'id' }
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft'
  },
  tripSnapshot: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'trip_snapshot'
  },
  synthesis: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  adaptationRequest: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'adaptation_request'
  },
  proposedChanges: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'proposed_changes'
  },
  reservedImpacts: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: 'reserved_impacts'
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: 'fr'
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'tripAdaptationSession'
})

User.hasMany(TripAdaptationSession, { foreignKey: 'userId' })
TripAdaptationSession.belongsTo(User, { foreignKey: 'userId' })
TripAdaptationSession.belongsTo(Trip, { foreignKey: 'tripId' })

// AiInteractionLog model
class AiInteractionLog extends Model {}
AiInteractionLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },
  feature: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  operation: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  sessionType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'session_type'
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'session_id'
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'trip_id',
    references: { model: 'trips', key: 'id' }
  },
  model: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  systemPrompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'system_prompt'
  },
  userPrompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_prompt'
  },
  requestMessages: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_messages'
  },
  requestPayload: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_payload'
  },
  rawResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'raw_response'
  },
  parsedResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'parsed_response'
  },
  tokenUsage: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'token_usage'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'success'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  }
}, {
  sequelize,
  underscored: true,
  timestamps: true,
  modelName: 'aiInteractionLog'
})

User.hasMany(AiInteractionLog, { foreignKey: 'userId' })
AiInteractionLog.belongsTo(User, { foreignKey: 'userId' })
AiInteractionLog.belongsTo(Trip, { foreignKey: 'tripId' })

// Relations for new models
Stage.hasMany(Flight, { foreignKey: 'stageId' })
Flight.belongsTo(Stage, { foreignKey: 'stageId' })

Stage.hasMany(Lodging, { foreignKey: 'stageId' })
Lodging.belongsTo(Stage, { foreignKey: 'stageId' })

Stage.hasMany(CarRental, { foreignKey: 'stageId' })
CarRental.belongsTo(Stage, { foreignKey: 'stageId' })

module.exports = {
  Language, Translation, User, Country, Trip, Stage, ActivityType, Activity,
  TransportType, Transport, AccommodationType, Accommodation,
  ExpenseCategory, Expense, NotificationType, Notification, TripList,
  Flight, Lodging, CarRental, TripPlanningSession, TripAdaptationSession, AiInteractionLog
}