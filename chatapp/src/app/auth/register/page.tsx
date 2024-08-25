"use client";

import { on } from "events";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { auth } from "../../../../firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Inputs = {
    email: string;
    password: string;
};

const RegisterPage = () => {
  const {
    register, 
    handleSubmit, 
    formState: {errors} 
  } = useForm<Inputs>();
  const router = useRouter();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await createUserWithEmailAndPassword(auth, data.email, data.password)
    .then((userCrendential) => {
        const user = userCrendential.user;
        router.push("/auth/login");
      })
      .catch((error) => {
        // console.error(error);
        // alert(error);
        if (error.code === "auth/email-already-in-use") {
          alert("このメールアドレスはすでに使用されています。");
        } else {
          alert(error.message);
        }
      });
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center">
        <form 
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-8 rounded-lg shadow-md w-96">
            <h1 className="mb-4 text-2xl text-gray-700 font-medium">新規登録</h1>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600">email</label>
                <input 
                  {...register("email", {
                    required: "This field is required",
                    pattern: {
                        value: /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/,
                        message: "invalid email address"
                    }
                  })}
                  type="text" className="mt-1 border-2 rounded-md w-full p-2" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-600">password</label>
                <input type="password" 
                  {...register("password", {
                    required: "This field is required",
                    minLength: {
                        value: 8,
                        message: "password must be at least 8 characters"
                    }
                  })}
                  className="mt-1 border-2 rounded-md w-full p-2" />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div className="flex justify-end">
                <button type="submit" className="mt-4 bg-blue-500 text-white font-bold rounded-md py-2 px-4 w-full hover:bg-blue-700">新規登録</button>
            </div>
            <div className="mt-4">
                <Link href="/auth/login"
                  className="mt-4 font-bold text-center text-sm text-blue-500 hover:text-blue-700">アカウントをお持ちの方はこちら</Link>
            </div>
        </form>
    </div>
  );
}

export default RegisterPage;
