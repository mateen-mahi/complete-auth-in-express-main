function Button({ children, loading, ...props }) {
  return (
    <button
      className="btn"
      disabled={loading}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

export default Button;