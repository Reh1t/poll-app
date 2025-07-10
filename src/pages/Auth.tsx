import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../app/supabase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type AuthFormData = {
  email: string;
  password: string;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>();

  const onSubmit = async (data: AuthFormData) => {
    const { email, password } = data;
    const action = isLogin ? "Logging in" : "Registering";

    toast.loading(`${action}...`, { id: "auth" });

    let result;
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }

    const { error } = result;

    if (error) {
      toast.error(error.message, { id: "auth" });
    } else {
      toast.success(`${isLogin ? "Logged in" : "Registered"} successfully!`, { id: "auth" });
      navigate("/"); // Redirect to homepage or dashboard
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login to Poll App" : "Register to Get Started"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition"
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="text-blue-600 hover:underline font-medium"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
