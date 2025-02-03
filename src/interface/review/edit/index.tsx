import { AutoresizableInput, Input } from "@/interface/input";
import { Star } from "@/interface/star";
import { LabeledSwitch } from "@/interface/switch";
import { CommentIcon, CommentWrapper } from "@/product/components";
import type { ReviewData } from "@/product/type";
import {
  PRODUCT_COMMENT_LENGTH_MAX,
  PRODUCT_NAME_LENGTH_MAX,
  PRODUCT_NAME_LENGTH_MIN,
  PRODUCT_RATING_MAX,
} from "@/product/validation";
import type { Model } from "@/state";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import type { TransformProperty } from "@/utils/object";
import { merge } from "@/utils/object";
import * as Radio from "@radix-ui/react-radio-group";
import type { UseFormRegisterReturn } from "react-hook-form";

type NameProps = {
  barcode: string;
  register: UseFormRegisterReturn;
};
export function Name({ barcode, register }: NameProps) {
  const { data } = trpc.product.getNames.useQuery({ barcode }, { staleTime: Infinity });
  const listId = "product-names";
  return (
    <label className="flex flex-col">
      <span className="p-2 text-sm">Name</span>
      <Input
        {...register}
        required
        minLength={PRODUCT_NAME_LENGTH_MIN}
        maxLength={PRODUCT_NAME_LENGTH_MAX}
        placeholder={data?.[0] ?? "Name"}
        autoComplete="off"
        aria-label="Product name"
        list={listId}
      />
      <datalist id={listId}>{data?.map((name) => <option key={name}>{name}</option>)}</datalist>
    </label>
  );
}

const ratingList = Array.from({ length: PRODUCT_RATING_MAX }, (_, i) => i + 1);
export function Rating({ value, setValue }: Model<number>) {
  return (
    <Radio.Root
      value={value.toString()}
      onValueChange={(val) => {
        setValue(+val);
      }}
      aria-label="rating"
      // radio item renders an invisible absolute input - relative keeps it in place
      className="group relative flex justify-between gap-4 text-6xl"
    >
      <Radio.Item
        value="0"
        className="sr-only"
      >
        <Star />
      </Radio.Item>
      {ratingList.map((x) => (
        <Radio.Item
          key={x}
          value={x.toString()}
          onClick={() => {
            if (x !== value) return;
            setValue(0);
          }}
          className="outline-none"
        >
          <Star
            highlight={x <= value}
            className="stroke-transparent stroke-[0.5px] transition-colors group-focus-visible-within:stroke-app-gold-400"
          />
        </Radio.Item>
      ))}
    </Radio.Root>
  );
}

type ProsConsCommentProps = {
  registerPros: UseFormRegisterReturn;
  registerCons: UseFormRegisterReturn;
  registerComment: UseFormRegisterReturn;
  review: Pick<ReviewForm, "pros" | "cons" | "comment">;
};
export function CommentSection({
  registerPros,
  registerCons,
  registerComment,
  review,
}: ProsConsCommentProps) {
  return (
    <CommentWrapper>
      <label className="flex py-2">
        <CommentIcon type="pros" />
        <AutoresizableInput
          rootClassName="grow pt-1.5"
          initialContent={review.pros ?? ""}
          {...registerPros}
          placeholder="Pros"
          maxLength={PRODUCT_COMMENT_LENGTH_MAX}
        />
      </label>
      <label className="flex py-2">
        <CommentIcon type="cons" />
        <AutoresizableInput
          rootClassName="grow pt-1.5"
          initialContent={review.cons ?? ""}
          {...registerCons}
          placeholder="Cons"
          maxLength={PRODUCT_COMMENT_LENGTH_MAX}
        />
      </label>
      <label className="py-2">
        <AutoresizableInput
          rootClassName="pt-1.5"
          initialContent={review.comment ?? ""}
          {...registerComment}
          placeholder="Comment"
          maxLength={PRODUCT_COMMENT_LENGTH_MAX}
        />
      </label>
    </CommentWrapper>
  );
}

export function Private({ value, setValue }: Model<boolean>) {
  return (
    <LabeledSwitch
      className={tw(
        "transition-colors duration-300",
        value ? "bg-app-green-100" : "bg-neutral-200",
      )}
      checked={value}
      onCheckedChange={setValue}
    >
      Private review
    </LabeledSwitch>
  );
}

export type ReviewForm = TransformProperty<ReviewData, "categories", Array<{ name: string }>>;

export function transformReview(data: ReviewData | null): ReviewForm | null {
  if (!data) {
    return data;
  }

  return merge(data, { categories: data.categories.map((x) => ({ name: x })) });
}
