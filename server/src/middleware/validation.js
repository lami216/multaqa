import { z } from 'zod';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      next(error);
    }
  };
};

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const studyPartnerCreateSchema = z.object({
  category: z.literal('study_partner'),
  subjectCodes: z.array(z.string().min(1)).min(1).max(2),
  postRole: z.enum(['need_help', 'can_help', 'td', 'archive']),
  durationHours: z.number().int().min(1).max(168),
  description: z.string().max(500).optional()
}).strict();

const standardPostCreateSchema = z.object({
  category: z.enum(['project_team', 'tutor_offer']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  tags: z.array(z.string()).optional(),
  faculty: z.string().optional(),
  level: z.enum(['L1', 'L2', 'L3', 'M1', 'M2']).optional(),
  languagePref: z.enum(['Arabic', 'French']).optional(),
  location: z.enum(['campus', 'online']).optional()
}).strict();

export const createPostSchema = z.union([studyPartnerCreateSchema, standardPostCreateSchema]);

export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  tags: z.array(z.string()).optional(),
  faculty: z.string().optional(),
  level: z.enum(['L1', 'L2', 'L3', 'M1', 'M2']).optional(),
  languagePref: z.enum(['Arabic', 'French']).optional(),
  location: z.enum(['campus', 'online']).optional(),
  subjectCodes: z.array(z.string().min(1)).min(1).max(2).optional(),
  postRole: z.enum(['need_help', 'can_help', 'td', 'archive']).optional(),
  extendHours: z.number().int().min(1).max(168).optional(),
  status: z.enum(['active', 'matched', 'expired']).optional()
}).strict();

export const closePostSchema = z.object({
  closeReason: z.string().max(500).optional()
}).strict();

const subjectArraySchema = z.array(z.string().min(1)).min(1);


const subjectSettingsSchema = z.object({
  subjectCode: z.string().min(1),
  isPriority: z.boolean()
});

export const profileSchema = z.object({
  displayName: z.string().optional(),
  facultyId: z.string().min(1),
  majorId: z.string().min(1),
  level: z.enum(['L1', 'L2', 'L3', 'M1', 'M2']),
  semesterId: z.string().min(1),
  subjectCodes: subjectArraySchema,
  subjects: subjectArraySchema.optional(),
  faculty: z.string().optional(),
  major: z.string().optional(),
  skills: z.array(z.string()).optional(),
  courses: z.array(z.string()).optional(),
  availability: z.string().optional(),
  languages: z.array(z.enum(['Arabic', 'French'])).optional(),
  bio: z.string().max(500).optional(),
  semester: z.string().optional(),
  subjectsSettings: z.array(subjectSettingsSchema).optional(),
  prioritiesOrder: z.array(z.enum(['need_help', 'can_help', 'td', 'archive'])).length(4).optional()
});

export const messageSchema = z.object({
  body: z.string().min(1).max(2000)
});

export const reportSchema = z.object({
  targetType: z.enum(['user', 'post', 'chat', 'message']),
  targetId: z.string(),
  reason: z.string().min(1),
  details: z.string().max(1000).optional()
});
