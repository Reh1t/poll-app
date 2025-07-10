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
  endsAt: string; // ISO string
};

const CreatePoll = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PollFormData>({
    defaultValues: {
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
    const options = data.options
      .map((opt) => opt.value.trim())
      .filter((opt) => opt.length > 0);

    if (options.length < 2) {
      toast.error("At least 2 options are required.");
      return;
    }

    toast.loading("Creating poll...", { id: "create" });

    const user = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from("polls").insert([
      {
        question: data.question.trim(),
        options,
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
      navigate("/"); // Redirect to poll list or homepage
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Create a New Poll</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Question */}
        <div>
          <label className="block mb-1 font-medium">Poll Question</label>
          <input
            {...register("question", { required: "Question is required" })}
            className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-400"
          />
          {errors.question && (
            <p className="text-red-500 text-sm">{errors.question.message}</p>
          )}
        </div>

        {/* Options */}
        <div>
          <label className="block mb-1 font-medium">Options</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...register(`options.${index}.value`, {
                    required: "Option is required",
                  })}
                  className="flex-1 border rounded px-3 py-2"
                />
                {fields.length > 2 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 font-bold"
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
                className="text-blue-600 font-semibold"
              >
                + Add Option
              </button>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("allowMultiple")} />
            Allow multiple selections
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("showResultsBeforeVote")} />
            Show results before voting
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("allowVoteChange")} />
            Allow vote change
          </label>

          <div>
            <label className="block mb-1 font-medium">
              End Date (optional)
            </label>
            <input
              type="datetime-local"
              {...register("endsAt")}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Create Poll
        </button>
      </form>
    </div>
  );
};

export default CreatePoll;
