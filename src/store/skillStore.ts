import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Skill } from '../types';

const STORAGE_KEY = '@openclaw_skills';

// Built-in skills
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'translator',
    name: '翻译专家',
    icon: '🌐',
    description: '专业多语言翻译，保持语境和风格',
    systemPrompt: '你是一个专业的多语言翻译专家。用户发送任何文本时，自动识别语言并翻译成目标语言。保持原文的语气、风格和专业术语的准确性。如果用户没有指定目标语言，默认翻译成中文（中文则翻译成英文）。',
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
  {
    id: 'coder',
    name: '编程助手',
    icon: '💻',
    description: '全栈开发专家，代码审查和最佳实践',
    systemPrompt: '你是一个资深全栈开发工程师。提供简洁、高质量的代码，遵循最佳实践。代码要有适当的错误处理和类型安全。解释关键设计决策，但不要过度解释显而易见的代码。优先使用现代语法和框架特性。',
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
  {
    id: 'writer',
    name: '写作助手',
    icon: '✍️',
    description: '文章撰写、润色、摘要生成',
    systemPrompt: '你是一个专业的中文写作助手。擅长文章撰写、内容润色、摘要提炼和文案创作。根据用户需求调整文风：正式/非正式、学术/通俗、简洁/详细。注重逻辑清晰、用词精准、表达流畅。',
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
  {
    id: 'analyst',
    name: '数据分析师',
    icon: '📊',
    description: '数据分析、图表解读、商业洞察',
    systemPrompt: '你是一个资深数据分析师。擅长数据解读、趋势分析、商业洞察。用结构化的方式呈现分析结果，提供可操作的建议。善于使用数字和比较来支撑观点。',
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
  {
    id: 'tutor',
    name: '学习导师',
    icon: '📚',
    description: '知识讲解、概念解释、学习辅导',
    systemPrompt: '你是一个耐心的学习导师。用简单易懂的方式解释复杂概念，善于使用类比和示例。根据提问者的水平调整讲解深度。鼓励思考，引导而非直接给答案。',
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
  {
    id: 'image-gen',
    name: '图片生成',
    icon: '🎨',
    description: 'AI 绘画，支持 DALL·E / Stable Diffusion 风格描述',
    systemPrompt: `你是一个 AI 图片生成助手。注意：只有在用户明确要求生成图片、画图、绘画时才触发图片生成。普通对话不要输出 [IMG_GEN] 标签。

当用户要求生成图片时：
1. 理解用户意图，将描述转化为详细的英文 prompt。
2. 用 [IMG_GEN] 标签包裹生成参数：[IMG_GEN]{"prompt":"英文描述","size":"1024x1024","style":"vivid"}[/IMG_GEN]
3. size 可选: "1024x1024"(方形), "1792x1024"(横版), "1024x1792"(竖版)。
4. style 可选: "vivid"(鲜明) 或 "natural"(自然)。
5. prompt 要详细，包含主体、风格、光线、构图、色调等。
6. 回复时先简要说明将生成什么，然后输出标签。

注意：图片生成会自动使用你已配置的服务商（DALL·E 3 / 通义万相 / Imagen 3 / MiniMax），无需额外配置。`,
    tools: [
      {
        name: 'generate_image',
        description: '调用 DALL·E API 根据文字描述生成图片',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: '英文图片描述 prompt' },
            size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'], description: '图片尺寸' },
            style: { type: 'string', enum: ['vivid', 'natural'], description: '风格' },
          },
          required: ['prompt'],
        },
      },
    ],
    builtIn: true,
    enabled: false,
    createdAt: 0,
  },
];

interface SkillStore {
  skills: Skill[];
  loaded: boolean;
  loadSkills: () => Promise<void>;
  toggleSkill: (id: string) => void;
  addSkill: (skill: Omit<Skill, 'id' | 'builtIn' | 'createdAt'>) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  getEnabledSkills: () => Skill[];
  getSkillSystemPrompt: () => string;
}

function generateId() {
  return 'skill_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: BUILTIN_SKILLS,
  loaded: false,

  loadSkills: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userSkills: Skill[] = JSON.parse(stored);
        // Merge: keep builtins (update enabled state), add user skills
        const builtinIds = BUILTIN_SKILLS.map((s) => s.id);
        const mergedBuiltins = BUILTIN_SKILLS.map((b) => {
          const saved = userSkills.find((s) => s.id === b.id);
          return saved ? { ...b, enabled: saved.enabled } : b;
        });
        const customSkills = userSkills.filter((s) => !builtinIds.includes(s.id));
        set({ skills: [...mergedBuiltins, ...customSkills], loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  toggleSkill: (id) => {
    set((state) => {
      const skills = state.skills.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
      return { skills };
    });
  },

  addSkill: (skill) => {
    const newSkill: Skill = {
      ...skill,
      id: generateId(),
      builtIn: false,
      createdAt: Date.now(),
    };
    set((state) => {
      const skills = [...state.skills, newSkill];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
      return { skills };
    });
  },

  updateSkill: (id, updates) => {
    set((state) => {
      const skills = state.skills.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
      return { skills };
    });
  },

  deleteSkill: (id) => {
    set((state) => {
      const skills = state.skills.filter((s) => s.id !== id || s.builtIn);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
      return { skills };
    });
  },

  getEnabledSkills: () => get().skills.filter((s) => s.enabled),

  getSkillSystemPrompt: () => {
    const enabled = get().skills.filter((s) => s.enabled);
    if (enabled.length === 0) return '';
    return enabled
      .map((s) => `[${s.name}]\n${s.systemPrompt}`)
      .join('\n\n');
  },
}));
