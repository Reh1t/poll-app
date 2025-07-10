import { useEffect, useState } from "react";
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>();

  useEffect(() => {
    const checkIfUserConfirmed = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !isLogin) {
        // No profile creation here
        setShowConfirmModal(false);
        toast.success("Email confirmed! You're now logged in.");
        navigate("/");
      }
    };

    const interval = setInterval(checkIfUserConfirmed, 3000);
    return () => clearInterval(interval);
  }, [isLogin, navigate]);

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
          toast.dismiss("auth");
          setShowConfirmModal(true);
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
              placeholder="you@example.com"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-background-dark"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Invalid email format",
                },
              })}
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
              placeholder="••••••••"
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold mb-2 dark:text-white">
              Confirm your email
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We've sent a confirmation link to your email. Once confirmed,
              this window will automatically close.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-400">
              Waiting for confirmation...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
