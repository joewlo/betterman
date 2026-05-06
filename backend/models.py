from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class EnvironmentBase(BaseModel):
    name: str
    variables: str = "{}"
    is_global: int = 0


class EnvironmentCreate(EnvironmentBase):
    pass


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    variables: Optional[str] = None
    is_global: Optional[int] = None


class Environment(EnvironmentBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CollectionBase(BaseModel):
    name: str
    description: str = ""
    environment_id: Optional[int] = None
    sort_order: int = 0


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    environment_id: Optional[int] = None
    sort_order: Optional[int] = None


class Collection(CollectionBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RequestBase(BaseModel):
    name: str
    method: str = "GET"
    url: str = ""
    headers: str = "[]"
    query_params: str = "[]"
    body: str = ""
    body_type: str = "none"
    auth: str = '{"type":"none"}'
    pre_request_script: str = ""
    post_response_script: str = ""
    sort_order: int = 0


class RequestCreate(RequestBase):
    collection_id: int


class RequestUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    headers: Optional[str] = None
    query_params: Optional[str] = None
    body: Optional[str] = None
    body_type: Optional[str] = None
    auth: Optional[str] = None
    pre_request_script: Optional[str] = None
    post_response_script: Optional[str] = None
    sort_order: Optional[int] = None


class Request(RequestBase):
    id: int
    collection_id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ExecuteRequest(BaseModel):
    method: str = "GET"
    url: str
    headers: str = "[]"
    query_params: str = "[]"
    body: str = ""
    body_type: str = "none"
    auth: str = '{"type":"none"}'
    pre_request_script: str = ""
    post_response_script: str = ""
    environment_id: Optional[int] = None
    collection_id: Optional[int] = None


class ExecuteResponse(BaseModel):
    status_code: int
    headers: str
    body: str
    elapsed_ms: float
    content_type: Optional[str] = None
    content_length: Optional[int] = None
    extracted_vars: dict = {}
    script_output: Optional[str] = None
    is_binary: bool = False


class SessionVariable(BaseModel):
    key: str
    value: Optional[str] = None
    scope: str = "session"


class SessionVariableCreate(BaseModel):
    key: str
    value: Optional[str] = None
    scope: str = "session"


class VariableResolveRequest(BaseModel):
    text: str
    environment_id: Optional[int] = None
    collection_id: Optional[int] = None


class ImportCurlRequest(BaseModel):
    curl_command: str
    collection_id: Optional[int] = None


class ImportPostmanRequest(BaseModel):
    payload: Any
    collection_id: Optional[int] = None
