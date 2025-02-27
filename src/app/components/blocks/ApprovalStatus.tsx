import { FC, ReactElement } from "react";
import classNames from "clsx";
import { useAtomValue } from "jotai";

import { approvalStatusAtom } from "app/atoms";
import Tooltip from "app/components/elements/Tooltip";
import Avatar from "app/components/elements/Avatar";
import { ReactComponent as SendIcon } from "app/icons/Send-activity.svg";
import { ReactComponent as ArrowIcon } from "app/icons/arrow-up.svg";

type ApprovalStatusProps = {
  theme?: "small" | "large";
  readOnly?: boolean;
  className?: string;
};

const ApprovalStatus: FC<ApprovalStatusProps> = ({
  theme = "large",
  readOnly,
  className,
}) => {
  const { total, previewActions } = useAtomValue(approvalStatusAtom);

  return (
    <div
      className={classNames(
        "flex items-center",
        !readOnly && total > 0 && "animate-pulse",
        className,
      )}
    >
      {total > 0 && (
        <>
          {previewActions.map(({ type, name, icon }, i, arr) => (
            <ActivityIcon
              key={`${type}_${name}`}
              Icon={type === "self" ? SendIcon : icon ?? ""}
              ariaLabel={type === "self" ? "Transfer transaction" : name ?? ""}
              theme={theme}
              className={i !== arr.length - 1 ? "mr-2" : ""}
            />
          ))}
        </>
      )}

      <span
        className={classNames(
          "flex items-center",
          "font-bold",
          readOnly ? "text-brand-inactivelight" : "text-brand-light",
          "ml-2",
          theme === "large" && "text-base mmd:text-sm mxs:text-xs",
          theme === "small" && "text-xs",
        )}
      >
        {total > 0 ? (
          <>
            +{total}
            {(theme === "large" || readOnly) && (
              <>
                <span className="flex items-center mmd:hidden">
                  &nbsp; waiting for approval
                  {!readOnly && <ArrowIcon className="ml-1" />}
                </span>
              </>
            )}
          </>
        ) : (
          !readOnly &&
          theme === "large" && (
            <span className="flex items-center mmd:hidden">
              Activity
              <ArrowIcon className="ml-1" />
            </span>
          )
        )}
      </span>
    </div>
  );
};

export default ApprovalStatus;

type ActivityIconProps = ApprovalStatusProps & {
  Icon: FC<{ className?: string }> | string;
  ariaLabel?: string;
  className?: string;
};

export const ActivityIcon: FC<ActivityIconProps> = ({
  theme,
  Icon,
  ariaLabel,
  className,
}) => {
  let content: ReactElement;

  if (typeof Icon === "string") {
    content = (
      <Avatar
        src={Icon}
        alt={ariaLabel}
        className={classNames(
          "block",
          "bg-white",
          "rounded-full overflow-hidden",
          theme === "large" &&
            "w-6 h-6 mmd:w-5 mmd:h-5 mxs:w-[1.125rem] mxs:h-[1.125rem]",
          theme === "small" && "w-[1.125rem] h-[1.125rem]",
          className,
        )}
        fallbackClassName={classNames(
          theme === "large" && "!h-3/5 mmd:!h-3/4",
          theme === "small" && "!h-3/4",
        )}
      />
    );
  } else {
    content = (
      <Icon
        className={classNames(
          "glass-icon--active",
          theme === "large" &&
            "w-6 h-6 mmd:w-5 mmd:h-5 mxs:w-[1.125rem] mxs:h-[1.125rem]",
          theme === "small" && "w-[1.125rem] h-[1.125rem]",
          className,
        )}
      />
    );
  }

  if (ariaLabel) {
    return <Tooltip content={ariaLabel}>{content}</Tooltip>;
  }

  return (
    <Icon
      className={classNames(
        theme === "large" &&
          "w-6 h-6 mmd:w-5 mmd:h-5 mxs:w-[1.125rem] mxs:h-[1.125rem]",
        theme === "small" && "w-[1.125rem] h-[1.125rem]",
        className,
      )}
    />
  );
};
