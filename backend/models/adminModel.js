import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: [true, 'Admin ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-z.]+@(foc\.sab\.ac\.lk|sab\.ac\.lk)$/,
      'Please use valid university admin email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^\+94\d{9}$/, 'Invalid mobile number format']
  },
  role: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Admin', 'Moderator'],
    default: 'Admin'
  },
  department: {
    type: String,
    enum: ['Software Engineering', 'Data Science', 'Information System', 'General', 'All'],
    default: 'All'
  },
  permissions: {
    manageUsers: { type: Boolean, default: true },
    manageCourses: { type: Boolean, default: true },
    viewReports: { type: Boolean, default: true },
    modifyAttendance: { type: Boolean, default: true },
    manageSystem: { type: Boolean, default: false },
    exportData: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});


const adminModel = mongoose.models.admin || mongoose.model('admin', adminSchema);

export default adminModel;