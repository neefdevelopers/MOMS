import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { GraphicReqsModule } from './modules/graphic-reqs/graphic-reqs.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FilesModule } from './modules/files/files.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    BrandsModule,
    ProductsModule,
    CalendarModule,
    ProjectsModule,
    ScriptsModule,
    GraphicReqsModule,
    TasksModule,
    ApprovalsModule,
    EquipmentModule,
    AttendanceModule,
    FilesModule,
    CommunicationsModule,
    NotificationsModule,
    ReportsModule,
    ActivityModule,
    SettingsModule,
  ],
})
export class AppModule {}
