type Result<T, E = Error> = Success<T> | Failure<E>;

type Success<T> = {
  success: true;
  value: T;
};

type Failure<E> = {
  success: false;
  error: E;
};

export const tryCatch = async <T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> => {
  try {
    const data = await promise;

    return { success: true, value: data };
  } catch (error) {
    return { success: false, error: error as E };
  }
};
