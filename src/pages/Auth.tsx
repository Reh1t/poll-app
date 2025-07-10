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

    try {
      const response = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      const { error } = response;

      if (error) {
        toast.error(error.message, { id: "auth" });
      } else {
        if (isLogin) {
          toast.success("Logged in successfully!", { id: "auth" });
          navigate("/");
        } else {
          toast.success(
            "Registration successful! Please check your email to confirm.",
            { id: "auth" }
          );
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", { id: "auth" });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4 dark:bg-background-dark">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full dark:bg-background-dark">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">
          {isLogin ? "Login to Pollify" : "Register to Get Started"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-background-dark"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-background-dark"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded text-white font-semibold transition ${
              isSubmitting
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm mt-4 text-gray-600 dark:text-gray-200">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline font-medium dark:text-blue-200"
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
