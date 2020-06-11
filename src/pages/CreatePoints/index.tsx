import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Map, TileLayer, Marker } from 'react-leaflet';
import api from '../../services/api';
import axios from 'axios';
import { LeafletMouseEvent } from 'leaflet';
import Dropzone from '../../components/dropzone';

import './styles.css';
import logo from '../../assets/logo.svg';

interface ItemInterface {
  id: number;
  title: string;
  image_url: string;
}

interface IbgeStateInterface {
  id: number;
  nome: string;
  sigla: string;
}

interface IbgeCitiesInterface {
  id: number;
  nome: string;
}

const CreatePoint = () => {
  const [items, setItems] = useState<ItemInterface[]>([]);
  const [states, setStates] = useState<IbgeStateInterface[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number>(0);
  const [selectedStateInitials, setSelectedStateInitials] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number>(0);
  const [selectedCityName, setSelectedCityName] = useState('');
  const [cities, setCities] = useState<IbgeCitiesInterface[]>([]);
  const [initialPosition, setInitialPosition] = useState<[number, number]>([0,0]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([0,0]);
  const [formData, setFormData] = useState({name: '', email: '', whatsapp: ''});
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const history = useHistory();
  const [selectedFile, setSelectedFile] = useState<File>();
  
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      setInitialPosition([latitude, longitude]);
      setSelectedPosition([latitude, longitude]);
    })
  }, []);

  useEffect(() => {
    api.get('items').then(resp => {
      setItems(resp.data)
    });
  }, []);
  
  useEffect(() => {
    axios.get<IbgeStateInterface[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome').then(resp => {
      setStates(resp.data)
    })
  }, []);
  
  useEffect(() => {
    axios.get<IbgeCitiesInterface[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedStateId}/municipios`).then(resp => {
      setCities(resp.data)
    });
    
  }, [selectedStateId]);

  function handleSelectState(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedStateId(Number(event.target.value));
    const [state] = states.filter(state => state.id === Number(event.target.value));
    setSelectedStateInitials(state.sigla);
  }
  
  function handleSelectCity(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCityId(Number(event.target.value));
    const [city] = cities.filter(city => city.id === Number(event.target.value));
    setSelectedCityName(city.nome);
  }

  function handleClickMap(event: LeafletMouseEvent) {
    setSelectedPosition([event.latlng.lat, event.latlng.lng]);
  }
  
  function handleInputChange (event: ChangeEvent<HTMLInputElement>){
    const { name, value } = event.target;
    setFormData({...formData, [name]: value})
  }
  
  function handleSelectItem(item_id: number) {
    const alreadySelected = selectedItems.findIndex(item => item === item_id);
    if (alreadySelected < 0) {
      setSelectedItems([...selectedItems, item_id]);
    } else {
      const filteredItems = selectedItems.filter(item => item !== item_id);
      setSelectedItems(filteredItems);
    }
  }

  async function handleSubmit(event: FormEvent){
    event.preventDefault();
    
    const { name, email, whatsapp } = formData;
    const city = selectedCityName;
    const uf = selectedStateInitials;
    const [latitude, longitude ] = selectedPosition;
    const items = selectedItems;
    const data = new FormData();
    
    data.append('name', name);
    data.append('email', email);
    data.append('whatsapp', whatsapp);
    data.append('city', city);
    data.append('uf', uf);
    data.append('latitude', String(latitude));
    data.append('longitude', String(longitude));
    data.append('items', items.join(','));

    if (selectedFile) {
      data.append('image', selectedFile);
    }
    
    await api.post('points', data);

    alert('Ponto de coleta criado!');

    history.push('/');
  }
  return (
    <div id="page-create-point">
      <header>
        <img src={logo} alt="Ecoleta"/>
        <Link to="/">
          <FiArrowLeft />
          voltar para home
        </Link>
      </header>
      <form onSubmit={handleSubmit}>
        <h1>Cadastro do <br /> banco de coleta</h1>
        <Dropzone onFileUploaded={setSelectedFile} />
        <fieldset>
          <legend>
            <h2>Dados</h2>
          </legend>
          <div className="field">
            <label htmlFor="name">Nome da entidade</label>
            <input
              onChange={handleInputChange}
              type="text"
              name="name"
              id="name" />
          </div>
          <div className="field-group">
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                onChange={handleInputChange}
                type="email"
                name="email"
                id="email" />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">Whatsapp</label>
              <input
                onChange={handleInputChange}
                type="text"
                name="whatsapp"
                id="whatsapp" />
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Endereço</h2>
            <span>Selecione o endereço no mapa</span>
          </legend>
          <Map center={initialPosition} zoom={15} onclick={handleClickMap}>
            <TileLayer
              attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={selectedPosition} />
          </Map>
          <div className="field-group">
            <div className="field">
              <label htmlFor="uf">UF</label>
              <select name="uf" id="uf" value={selectedStateId} onChange={handleSelectState}>
                <option value="0">Selecione uma UF</option>
                {states.map(uf => (
                  <option value={uf.id} key={uf.id}>{uf.nome}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">Cidade</label>
              <select name="city" id="city" value={selectedCityId} onChange={handleSelectCity}>
                <option value="0">Selecione uma Cidade</option>
                {cities.map(city => (
                  <option value={city.id} key={city.id}>{city.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Ítens de coleta</h2>
            <span>Selecione um ou mais items abaixo</span>
          </legend>
          <ul className="items-grid">
            {items.map(item => (
              <li key={item.id} onClick={() => handleSelectItem(item.id)} className={selectedItems.includes(item.id) ? 'selected' : ''}>
                <img src={item.image_url} alt={item.title} />
                <span>{item.title}</span>
              </li>
            ))};
          </ul>
        </fieldset>
        <button type="submit">
          Cadastrar ponto de coleta
        </button>
      </form>
    </div>
  );
};

export default CreatePoint;