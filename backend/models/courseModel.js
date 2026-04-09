import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{2}\d{4}$/, 'Invalid course code format (e.g., SE6101)']
  },
  courseName: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    minlength: [3, 'Course name must be at least 3 characters'],
    maxlength: [200, 'Course name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  credits: {
    type: Number,
    required: [true, 'Course credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [6, 'Credits cannot exceed 6']
  },
  department: {
    type: String,
    required: true,
    enum: ['Software Engineering', 'Information System', 'Data Science', 'General']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be between 1 and 8'],
    max: [8, 'Semester must be between 1 and 8']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}\/\d{4}$/, 'Invalid academic year format (e.g., 2025/2026)']
  },
  batch: {
    type: String,
    required: [true, 'Batch is required'],
    enum: ['2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026']
  },
  lecturers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer'
  }],
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  totalLectures: {
    type: Number,
    default: 15
  },
  lecturesCompleted: {
    type: Number,
    default: 0
  },
  attendanceThreshold: {
    type: Number,
    default: 80,
    min: [50, 'Threshold must be at least 50%'],
    max: [100, 'Threshold cannot exceed 100%']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  courseType: {
    type: String,
    enum: ['Theory', 'Practical', 'Theory + Practical'],
    default: 'Theory'
  },
  venue: {
    type: String,
    trim: true,
    default: 'TBA'
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    }
  }]
}, {
  timestamps: true
});

const courseModel = mongoose.models.course || mongoose.model('course', courseSchema);

export default courseModel;