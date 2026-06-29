import { api } from './http';

export const aiApi = {
  analyzeProject: (payload: {
    projectData: any;
    tasks: any[];
    messages: { role: 'user' | 'assistant'; content: string }[];
    question: string;
  }) => api.post('/ai/analyze-project', payload),
};
