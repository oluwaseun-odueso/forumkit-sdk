export const pipeline = async (task: string, _model: string) => {
  if (task === 'feature-extraction') {
    return async (_text: string, _opts: unknown) => ({
      data: new Float32Array(384).fill(1 / Math.sqrt(384)),
    });
  }
  return async (_text: string, _opts: unknown) => [
    { label: 'toxic', score: 0.01 },
  ];
};
