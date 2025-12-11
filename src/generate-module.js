const fs = require("fs");
const path = require("path");

const MODULES_DIR = path.join(__dirname, "app/modules");

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const templates = (moduleName) => {
  const Capitalized = capitalize(moduleName);

  return {
    controller: `
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ${moduleName}Service } from './${moduleName}.service';
import { Request, Response } from 'express';

// create ${Capitalized}
const create${Capitalized} = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await ${moduleName}Service.create${Capitalized}(data);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: '${Capitalized} created successfully',
    data: result,
  });
});

// get all ${Capitalized}
const get${Capitalized}List = catchAsync(async (req: Request, res: Response) => {
  const result = await ${moduleName}Service.get${Capitalized}List();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} list retrieved successfully',
    data: result,
  });
});

// get ${Capitalized} by id
const get${Capitalized}ById = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const result = await ${moduleName}Service.get${Capitalized}ById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} details retrieved successfully',
    data: result,
  });
});

// update ${Capitalized}
const update${Capitalized} = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const data = req.body;
  const result = await ${moduleName}Service.update${Capitalized}(id, data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} updated successfully',
    data: result,
  });
});

// delete ${Capitalized}
const delete${Capitalized} = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const result = await ${moduleName}Service.delete${Capitalized}(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} deleted successfully',
    data: result,
  });
});

export const ${moduleName}Controller = {
  create${Capitalized},
  get${Capitalized}List,
  get${Capitalized}ById,
  update${Capitalized},
  delete${Capitalized},
};
`,

    service: `
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// create ${Capitalized}
const create${Capitalized} = async (data: any) => {
  const result = await prisma.${moduleName}.create({ data });
  return result;
};

// get all ${Capitalized}
const get${Capitalized}List = async () => {
  return prisma.${moduleName}.findMany();
};

// get ${Capitalized} by id
const get${Capitalized}ById = async (id: string) => {
  const result = await prisma.${moduleName}.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, '${Capitalized} not found');
  }
  return result;
};

// update ${Capitalized}
const update${Capitalized} = async (id: string, data: any) => {
  const result = await prisma.${moduleName}.update({ 
  where: { id }, data });
  return result;
};

// delete ${Capitalized}
const delete${Capitalized} = async (id: string) => {
  return prisma.${moduleName}.delete({ where: { id } });
};

export const ${moduleName}Service = {
  create${Capitalized},
  get${Capitalized}List,
  get${Capitalized}ById,
  update${Capitalized},
  delete${Capitalized},
};
`,

    routes: `
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ${moduleName}Controller } from './${moduleName}.controller';
import { ${moduleName}Validation } from './${moduleName}.validation';

const router = express.Router();

router.post('/', auth(), ${moduleName}Controller.create${Capitalized});

router.get('/', auth(), ${moduleName}Controller.get${Capitalized}List);

router.get('/:id', auth(), ${moduleName}Controller.get${Capitalized}ById);

router.put('/:id', auth(), ${moduleName}Controller.update${Capitalized});

router.delete('/:id', auth(), ${moduleName}Controller.delete${Capitalized});

export const ${moduleName}Routes = router;
`,

    validation: `
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const ${moduleName}Validation = {
  createSchema,
  updateSchema,
};
`,
  };
};

const generateModule = (moduleName) => {
  if (!moduleName) {
    console.error("❌ Please provide a module name!");
    process.exit(1);
  }

  const modulePath = path.join(MODULES_DIR, moduleName);
  if (fs.existsSync(modulePath)) {
    console.error(`❌ Module '${moduleName}' already exists!`);
    process.exit(1);
  }

  fs.mkdirSync(modulePath, { recursive: true });

  // Generate files from templates
  Object.entries(templates(moduleName)).forEach(([key, content]) => {
    const filePath = path.join(modulePath, `${moduleName}.${key}.ts`);
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Created: ${filePath}`);
  });

  console.log(`🎉 Module '${moduleName}' created successfully!`);
};

// Run script
const [, , moduleName] = process.argv;
generateModule(moduleName);
