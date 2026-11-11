package shared

import "github.com/gofiber/fiber/v3"

// envelope membungkus seluruh respons sukses.
type envelope[T any] struct {
	Data T `json:"data"`
}

// Data mengirim payload sukses dalam envelope {data: ...}.
func Data[T any](c fiber.Ctx, payload T) error {
	return c.JSON(envelope[T]{Data: payload})
}

// metaEnvelope membungkus payload sukses yang menyertakan metadata.
type metaEnvelope[T, M any] struct {
	Data T `json:"data"`
	Meta M `json:"meta"`
}

// DataWithMeta mengirim payload sukses dalam envelope {data, meta}.
func DataWithMeta[T, M any](c fiber.Ctx, payload T, meta M) error {
	return c.JSON(metaEnvelope[T, M]{Data: payload, Meta: meta})
}
