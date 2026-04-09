import mongoose from 'mongoose';

const lecturerSchema = new mongoose.Schema({
  lecturerId: {
    type: String,
    required: [true, 'Lecturer ID is required'],
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
      /^[a-z.]+@foc\.sab\.ac\.lk$/,
      'Please use valid university lecturer email'
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
    match: [/^\+94\d{9}$/, 'Invalid Sri Lankan mobile number format']
  },
  department: {
    type: String,
    required: true,
    enum: ['Software Engineering', 'Information System', 'Data Science', 'General']
  },
  designation: {
    type: String,
    required: true,
    enum: ['Professor', 'Senior Lecturer', 'Lecturer', 'Assistant Lecturer', 'Instructor']
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
  profileImage: {
    type: String,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationTokenExpire: Date,
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const lecturerModel = mongoose.models.Lecturer || mongoose.model('Lecturer', lecturerSchema);

export default lecturerModel;