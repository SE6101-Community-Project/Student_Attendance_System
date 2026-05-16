import courseModel from "../models/courseModel.js";
import studentModel from "../models/studentModel.js";
import lecturerModel from "../models/lecturerModel.js";


// ─────────────────────────────────────────
// @desc    Create course
// @route   POST /api/course/create
// @access  Private (Admin)
// ─────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      description,
      credits,
      department,
      semester,
      academicYear,
      batch,
      attendanceThreshold,
      courseType,
      venue,
      schedule,
    } = req.body;

    if (
      !courseCode ||
      !courseName ||
      !credits ||
      !department ||
      !semester ||
      !academicYear ||
      !batch
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existing = await courseModel.findOne({ courseCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Course with this code already exists",
      });
    }

    const course = await courseModel.create({
      courseCode,
      courseName,
      description,
      credits,
      department,
      semester,
      academicYear,
      batch,
      attendanceThreshold: attendanceThreshold || 80,
      courseType: courseType || "Theory",
      venue,
      schedule,
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Get all courses
// @route   GET /api/course/all
// @access  Private (Admin, Lecturer)
// ─────────────────────────────────────────
export const getAllCourses = async (req, res) => {
  try {
    const {
      department,
      semester,
      batch,
      isActive,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);
    if (batch) filter.batch = batch;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const courses = await courseModel
      .find(filter)
      .populate("lecturers", "name lecturerId email")
      .populate("enrolledStudents", "studentId name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ semester: 1, courseCode: 1 });

    const total = await courseModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Get course by ID
// @route   GET /api/course/:id
// @access  Private
// ─────────────────────────────────────────
export const getCourseById = async (req, res) => {
  try {
    const course = await courseModel
      .findById(req.params.id)
      .populate("lecturers", "name lecturerId email department designation")
      .populate("enrolledStudents", "studentId name email batch");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Update course
// @route   PUT /api/course/:id
// @access  Private (Admin)
// ─────────────────────────────────────────
export const updateCourse = async (req, res) => {
  try {
    const course = await courseModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Delete course
// @route   DELETE /api/course/:id
// @access  Private (Admin)
// ─────────────────────────────────────────
export const deleteCourse = async (req, res) => {
  try {
    const course = await courseModel.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Assign lecturer to course
// @route   PUT /api/course/:id/assign-lecturer
// @access  Private (Admin)
// ─────────────────────────────────────────
export const assignLecturerToCourse = async (req, res) => {
  try {
    const { lecturerId } = req.body;

    const course = await courseModel.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const lecturer = await lecturerModel.findById(lecturerId);
    if (!lecturer) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
      });
    }

    // Add to course if not already there
    if (
      !course.lecturers.map((l) => l.toString()).includes(lecturerId.toString())
    ) {
      course.lecturers.push(lecturerId);
      await course.save();
    }

    // Add to lecturer if not already there
    if (
      !lecturer.courses.map((c) => c.toString()).includes(course._id.toString())
    ) {
      lecturer.courses.push(course._id);
      await lecturer.save();
    }

    res.status(200).json({
      success: true,
      message: `${lecturer.name} assigned to ${course.courseCode} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Enroll student in course
// @route   PUT /api/course/:id/enroll-student
// @access  Private (Admin)
// ─────────────────────────────────────────
export const enrollStudentInCourse = async (req, res) => {
  try {
    const { studentId } = req.body;

    const course = await courseModel.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const student = await studentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      !course.enrolledStudents
        .map((s) => s.toString())
        .includes(studentId.toString())
    ) {
      course.enrolledStudents.push(studentId);
      await course.save();
    }

    if (
      !student.courses.map((c) => c.toString()).includes(course._id.toString())
    ) {
      student.courses.push(course._id);
      await student.save();
    }

    res.status(200).json({
      success: true,
      message: `${student.name} enrolled in ${course.courseCode} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Bulk enroll students
// @route   PUT /api/course/:id/bulk-enroll
// @access  Private (Admin)
// ─────────────────────────────────────────
export const bulkEnrollStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs array is required",
      });
    }

    const course = await courseModel.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const existingIds = course.enrolledStudents.map((s) => s.toString());
    const newStudentIds = studentIds.filter(
      (id) => !existingIds.includes(id.toString()),
    );

    if (newStudentIds.length > 0) {
      course.enrolledStudents.push(...newStudentIds);
      await course.save();

      await studentModel.updateMany(
        { _id: { $in: newStudentIds } },
        { $addToSet: { courses: course._id } },
      );
    }

    res.status(200).json({
      success: true,
      message: `${newStudentIds.length} students enrolled successfully`,
      data: {
        enrolledCount: newStudentIds.length,
        skippedCount: studentIds.length - newStudentIds.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};