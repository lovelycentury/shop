import { describe, expect, it } from "vitest"
import { computed, reactive, ref } from "vue"

import remap from "../remap"

describe("remap", () => {
  it("prefixes every key, capitalizing the original first letter", () => {
    const result = remap(
      { status: "success", isLoading: false, error: null, isError: false },
      "user"
    )

    expect(result).toEqual({
      userStatus: "success",
      userIsLoading: false,
      userError: null,
      userIsError: false,
    })
    expect(Object.keys(result)).toEqual([
      "userStatus",
      "userIsLoading",
      "userError",
      "userIsError",
    ])
  })

  it("drops the original keys", () => {
    const result = remap({ status: "pending" }, "user")

    expect("status" in result).toBe(false)
  })

  it("leaves an already capitalized key as it is", () => {
    expect(remap({ Status: "pending" }, "user")).toEqual({
      userStatus: "pending",
    })
  })

  it("passes refs through as the same ref", () => {
    const status = ref("pending")
    const { userStatus } = remap({ status }, "user")

    expect(userStatus).toBe(status)

    status.value = "success"
    expect(userStatus.value).toBe("success")
  })

  it("keeps a reactive source live", () => {
    const source = reactive({ count: 0 })
    const result = remap(source, "cart")
    const doubled = computed(() => result.cartCount * 2)

    expect(result.cartCount).toBe(0)

    source.count = 2
    expect(result.cartCount).toBe(2)
    expect(doubled.value).toBe(4)
  })

  it("passes functions through, callable after destructuring", () => {
    const { userRefetch } = remap({ refetch: () => "refetched" }, "user")

    expect(userRefetch()).toBe("refetched")
  })

  it("returns an empty object for an empty source", () => {
    expect(remap({}, "user")).toEqual({})
  })

  it("does not mutate the source", () => {
    const source = { status: "pending" }
    remap(source, "user")

    expect(source).toEqual({ status: "pending" })
  })
})
