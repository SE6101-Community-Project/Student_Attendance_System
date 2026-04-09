import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^\d{2}CSE\d{4}$/, 'Invalid student ID format (e.g., 21CSE0001)']
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
      /^[a-z]+@std\.foc\.sab\.ac\.lk$/,
      'Please use valid university email (e.g., username@std.foc.sab.ac.lk)'
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
    match: [/^\+94\d{9}$/, 'Invalid mobile number format (+94XXXXXXXXX)']
  },
  batch: {
    type: String,
    required: [true, 'Batch is required'],
    enum: ['2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026']
  },
  department: {
    type: String,
    required: true,
    default: 'Software Engineering',
    enum: ['Software Engineering', 'Information System', 'Data Science']
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  faceEncoding: {
    type: [Number],   // stores 128 numbers
    select: false, 
    default: null
  },
  faceDataRegistered: {
    type: Boolean,
    select: false, 
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationTokenExpire: Date
}, {
  timestamps: true
});

const studentModel = mongoose.models.student || mongoose.model('student', studentSchema);

export default studentModel;