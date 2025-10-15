describe('Worker Tests', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(3 + 3).toBe(6);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});