import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
import { SchoolService } from './school.service';

@Controller('school')
@UseGuards(JwtAuthGuard)
@RequireModule('school')
export class SchoolController {
  constructor(private school: SchoolService) {}

  // Students
  @Get('students')
  listStudents(@Req() req: any, @Query('grade') grade?: string, @Query('section') section?: string, @Query('search') search?: string) {
    return this.school.listStudents(req.user.tenantId, { grade, section, search });
  }

  @Post('students')
  createStudent(@Req() req: any, @Body() dto: any) {
    return this.school.createStudent(req.user.tenantId, dto);
  }

  @Put('students/:id')
  updateStudent(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.school.updateStudent(req.user.tenantId, id, dto);
  }

  // Teachers
  @Get('teachers')
  listTeachers(@Req() req: any) {
    return this.school.listTeachers(req.user.tenantId);
  }

  @Post('teachers')
  createTeacher(@Req() req: any, @Body() dto: any) {
    return this.school.createTeacher(req.user.tenantId, dto);
  }

  // Classes
  @Get('classes')
  listClasses(@Req() req: any) {
    return this.school.listClasses(req.user.tenantId);
  }

  @Post('classes')
  createClass(@Req() req: any, @Body() dto: any) {
    return this.school.createClass(req.user.tenantId, dto);
  }

  @Post('classes/:id/enroll')
  enroll(@Req() req: any, @Param('id') classId: string, @Body('studentId') studentId: string) {
    return this.school.enroll(req.user.tenantId, classId, studentId);
  }

  // Exams
  @Get('exams')
  listExams(@Req() req: any) {
    return this.school.listExams(req.user.tenantId);
  }

  @Post('exams')
  createExam(@Req() req: any, @Body() dto: any) {
    return this.school.createExam(req.user.tenantId, dto);
  }

  @Post('exams/:id/results')
  recordResult(@Req() req: any, @Param('id') examId: string, @Body() dto: any) {
    return this.school.recordResult(req.user.tenantId, examId, dto);
  }

  @Get('exams/:id/results')
  listResults(@Req() req: any, @Param('id') examId: string) {
    return this.school.listResults(req.user.tenantId, examId);
  }
}
