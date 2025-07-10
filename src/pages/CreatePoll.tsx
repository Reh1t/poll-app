import { useForm, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { supabase } from "../app/supabase";
import { useNavigate } from "react-router-dom";

type PollOption = { value: string };

type PollFormData = {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  showResultsBeforeVote: boolean;
  allowVoteChange: boolean;
  endsAt: string;
};

const CreatePoll = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PollFormData>({
    defaultValues: {
      question: "",
      options: [{ value: "" }, { value: "" }],
      allowMultiple: false,
      showResultsBeforeVote: true,
      allowVoteChange: false,
      endsAt: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const navigate = useNavigate();

  const onSubmit = async (data: PollFormData) => {
    const trimmedOptions = data.options
      .map((opt) => opt.value.trim())
      .filter((opt) => opt.length > 0);

    if (trimmedOptions.length < 2) {
      toast.error("At least 2 non-empty options are required.");
      return;
    }

    toast.loading("Creating poll...", { id: "create" });

    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase.from("polls").insert([
        {
          question: data.question.trim(),
          options: trimmedOptions,
          settings: {
            allowMultiple: data.allowMultiple,
            showResultsBeforeVote: data.showResultsBeforeVote,
            allowVoteChange: data.allowVoteChange,
          },
          ends_at: data.endsAt || null,
          created_by: user?.id || null,
        },
      ]);

      if (error) {
        toast.error("Failed to create poll", { id: "create" });
        console.error(error);
      } else {
        toast.success("Poll created successfully!", { id: "create" });
        navigate("/");
      }
    } catch (err) {
      toast.error("Unexpected error occurred", { id: "create" });
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 h-screen">
      <div className="bg-white border rounded-xl shadow-md p-6 space-y-6 ring-2 ring-gray-100 dark:bg-background-dark dark:text-gray-200" >
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200">
          Create a Poll
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 dark:text-gray-700">
          {/* Question */}
          <div>
            <input
              {...register("question", {
                required: "Poll question is required",
              })}
              placeholder="Type your question here..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-background-dark dark:text-gray-200"
            />
            {errors.question && (
              <p className="text-red-500 text-sm mt-1">
                {errors.question.message}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  {...register(`options.${index}.value`, {
                    required: "Option cannot be empty",
                  })}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-background-dark dark:text-gray-200"
                />
                {fields.length > 2 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {fields.length < 10 && (
              <button
                type="button"
                onClick={() => append({ value: "" })}
                className="text-sm text-blue-600 hover:underline mt-2"
              >
                + Add another option
              </button>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50 space-y-3 dark:bg-background-dark dark:text-gray-200">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("allowMultiple")} />
              Allow multiple choices
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("showResultsBeforeVote")} />
              Show results before voting
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("allowVoteChange")} />
              Allow vote changes
            </label>
            <div className="pt-2">
              <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-200">
                End Time (optional)
              </label>
              <input
                type="datetime-local" 
                {...register("endsAt")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none  dark:bg-background-dark dark:text-gray-200"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold shadow transition dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isSubmitting ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePoll;
