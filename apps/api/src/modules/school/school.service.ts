import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService) {}

  // ---- Students ----
  listStudents(tenantId: string, params?: { grade?: string; section?: string; search?: string }) {
    const where: any = { tenantId };
    if (params?.grade) where.grade = params.grade;
    if (params?.section) where.section = params.section;
    if (params?.search) where.name = { contains: params.search, mode: 'insensitive' };
    return this.prisma.student.findMany({ where, orderBy: { name: 'asc' } });
  }

  createStudent(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.student.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        grade: dto.grade || null,
        section: dto.section || null,
        rollNumber: dto.rollNumber || null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        parentName: dto.parentName || null,
        parentPhone: dto.parentPhone || null,
        userId: dto.userId || null,
      },
    });
  }

  async updateStudent(tenantId: string, id: string, dto: any) {
    await this.assertExists(this.prisma.student, tenantId, id, 'Student');
    return this.prisma.student.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        grade: dto.grade,
        section: dto.section,
        rollNumber: dto.rollNumber,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
      },
    });
  }

  // ---- Teachers ----
  listTeachers(tenantId: string) {
    return this.prisma.teacher.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createTeacher(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.teacher.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        subject: dto.subject || null,
        qualification: dto.qualification || null,
        userId: dto.userId || null,
      },
    });
  }

  // ---- Classes & enrollment ----
  listClasses(tenantId: string) {
    return this.prisma.class.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { teacher: true, _count: { select: { students: true } } },
    });
  }

  createClass(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.class.create({
      data: {
        tenantId,
        name: dto.name,
        grade: dto.grade || null,
        section: dto.section || null,
        teacherId: dto.teacherId || null,
      },
    });
  }

  async enroll(tenantId: string, classId: string, studentId: string) {
    await this.assertExists(this.prisma.class, tenantId, classId, 'Class');
    await this.assertExists(this.prisma.student, tenantId, studentId, 'Student');
    const existing = await this.prisma.enrollment.findFirst({ where: { studentId, classId } });
    if (existing) throw new BadRequestException('Student is already enrolled in this class');
    return this.prisma.enrollment.create({ data: { tenantId, studentId, classId } });
  }

  // ---- Exams & results ----
  listExams(tenantId: string) {
    return this.prisma.exam.findMany({
      where: { tenantId },
      orderBy: { examDate: 'desc' },
      include: { _count: { select: { results: true } } },
    });
  }

  createExam(tenantId: string, dto: any) {
    if (!dto?.name || !dto?.subject || dto.totalMarks == null || dto.passingMarks == null || !dto.examDate) {
      throw new BadRequestException('name, subject, totalMarks, passingMarks and examDate are required');
    }
    return this.prisma.exam.create({
      data: {
        tenantId,
        name: dto.name,
        subject: dto.subject,
        totalMarks: Number(dto.totalMarks),
        passingMarks: Number(dto.passingMarks),
        examDate: new Date(dto.examDate),
      },
    });
  }

  async recordResult(tenantId: string, examId: string, dto: any) {
    if (!dto?.studentId || dto.marksObtained == null) {
      throw new BadRequestException('studentId and marksObtained are required');
    }
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } });
    if (!exam) throw new NotFoundException('Exam not found');
    await this.assertExists(this.prisma.student, tenantId, dto.studentId, 'Student');
    const marks = Number(dto.marksObtained);
    if (marks < 0 || marks > exam.totalMarks) {
      throw new BadRequestException(`marksObtained must be between 0 and ${exam.totalMarks}`);
    }
    return this.prisma.examResult.upsert({
      where: { studentId_examId: { studentId: dto.studentId, examId } },
      create: { tenantId, studentId: dto.studentId, examId, marksObtained: marks, grade: dto.grade || null, remarks: dto.remarks || null },
      update: { marksObtained: marks, grade: dto.grade || null, remarks: dto.remarks || null },
    });
  }

  listResults(tenantId: string, examId: string) {
    return this.prisma.examResult.findMany({
      where: { tenantId, examId },
      include: { student: true },
      orderBy: { marksObtained: 'desc' },
    });
  }

  private async assertExists(model: any, tenantId: string, id: string, label: string) {
    const row = await model.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!row) throw new NotFoundException(`${label} not found`);
  }
}
