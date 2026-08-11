import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();
    const formulas = await this.prisma.outputFormula.findMany();
    const departments = await this.prisma.department.findMany({ include: { employees: true } });
    const skills = await this.prisma.skill.findMany();

    return {
      settings,
      formulas,
      departments,
      skills,
    };
  }

  async updateSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async updateFormula(id: string, outputValue: number) {
    return this.prisma.outputFormula.update({
      where: { id },
      data: { outputValue: parseFloat(outputValue.toString()) },
    });
  }
}
