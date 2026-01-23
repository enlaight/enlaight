from rest_framework import serializers


class ProjectBotsAssociationSerializer(serializers.Serializer):
    bot_id = serializers.UUIDField(required=False)
    bot_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate(self, attrs):
        ids = []
        if "bot_id" in attrs and attrs["bot_id"] is not None:
            ids.append(attrs["bot_id"])
        if "bot_ids" in attrs and attrs["bot_ids"]:
            ids.extend(attrs["bot_ids"])
        if not ids:
            raise serializers.ValidationError("Informe 'bot_id' ou 'bot_ids'.")

        # dedup preserving order
        seen = set()  # holds seen uids
        norm = []  # normalized list
        for uid in ids:
            if uid not in seen:
                seen.add(uid)
                norm.append(uid)

        return {"ids": norm}


class ProjectUsersAssociationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=False)
    user_ids = serializers.ListField(child=serializers.UUIDField(), required=False)

    def validate(self, attrs):
        ids = []
        if attrs.get("user_id") is not None:
            ids.append(attrs["user_id"])
        if attrs.get("user_ids"):
            ids.extend(attrs["user_ids"])
        if not ids:
            raise serializers.ValidationError("Informe 'user_id' ou 'user_ids'.")

        seen, norm = set(), []
        for uid in ids:
            if uid not in seen:
                seen.add(uid)
                norm.append(uid)
        return {"ids": norm}
