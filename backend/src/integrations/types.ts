export interface ToolCard {
  name: string;
  description: string;
  method: string;
  path: string;
  params: Record<
    string,
    {
      type: string;
      required: boolean;
      minLength?: number;
      maxLength?: number;
      enum?: string[];
      format?: string;
    }
  >;
}
